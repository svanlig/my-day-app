const KEY='myday-v3-complete';const $=id=>document.getElementById(id);const uid=p=>p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{tasks:[],pursuits:[],challenges:[],reminders:[],days:{},calendarEvents:{}};
data.reminders??=[];
data.calendarEvents??={};
data.challengeJournals??={};data.exportedChallengeYears??={};data.taskOverrides??={};
// Calendar state
let calendarView = new Date();
calendarView.setDate(1); // First of current month
let hist=todayKey(),pastOpen={},scheduleOpen={};
let lastNotified=null;
let audioCtx=null;
function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext);if(audioCtx.state==='suspended')audioCtx.resume();}
function playSound(){if(!audioCtx)return;if(audioCtx.state==='suspended')audioCtx.resume();try{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g),g.connect(audioCtx.destination),g.gain.value=.3,o.frequency.value=800,o.start(),g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1),o.stop(audioCtx.currentTime+.1)}catch(e){}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function todayKey(){return key(new Date())}
function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function D(k){return new Date(k+'T12:00:00')}
function dateText(k){return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(D(k))}
function short(k){return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(D(k))}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function min(t){let a=t.split(':');return +a[0]*60+ +a[1]}function now(){let d=new Date();return d.getHours()*60+d.getMinutes()}
function tt(t){let a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+' '+(h>=12?'PM':'AM')}
function day(k=todayKey()){data.days[k]??={tasks:{},pursuits:{},challenges:{},reminders:[]};data.days[k].reminders??=[];return data.days[k]}
function ts(id,k=todayKey()){let x=day(k);x.tasks[id]??={done:false,note:''};return x.tasks[id]}
function ps(id,k=todayKey()){let x=day(k);x.pursuits[id]??={done:false,note:''};return x.pursuits[id]}
function cs(id,k=todayKey()){let x=day(k);x.challenges[id]??={done:false,comment:''};return x.challenges[id]}
function tasks(){return data.tasks.filter(x=>x.daily!==false).sort((a,b)=>a.start.localeCompare(b.start))}
document.querySelectorAll('nav button').forEach(b=>{b.onclick=()=>{initAudio();document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.page));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.page==='calendar'){renderCalendar()}else{render()}}});
function weekday(k){return (D(k).getDay()+6)%7}
function migrateSchedule(){let changed=false;data.tasks.forEach(t=>{if(!t.schedule){t.schedule={type:t.daily===false?'unscheduled':'daily'};changed=true}});if(changed)save()}function taskForDate(k){let w=weekday(k),items=[];data.tasks.forEach(t=>{let s=t.schedule||{};if(s.type==='daily'){let o=data.taskOverrides[t.id]?.[w];if(!o?.deleted)items.push(o?{...t,...o,parentId:t.id,weekday:w}:{...t,parentId:t.id,weekday:w})}else if(s.type==='weekday'&&+s.weekday===w)items.push({...t,weekday:w});else if(s.type==='once'&&s.date===k)items.push({...t,weekday:w})});return items.sort((a,b)=>a.start.localeCompare(b.start))}function tasks(k=todayKey()){return taskForDate(k)}migrateSchedule();
document.querySelectorAll('.todayToggle').forEach(b=>b.onclick=()=>{let content=$(b.dataset.target),minimized=content.classList.toggle('hidden');b.textContent=minimized?'＋':'−';b.setAttribute('aria-expanded',String(!minimized));b.setAttribute('aria-label',(minimized?'Maximize ':'Minimize ')+b.closest('.head').querySelector('h2').textContent)});
document.onclick=()=>{if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume()};
function archiveCompletedReminders(){let before=data.reminders.length;data.reminders=data.reminders.filter(r=>!r.completedOn||r.completedOn>=todayKey());if(data.reminders.length!==before)save()}
function render() { 
  archiveCompletedReminders();
 const now = new Date();
const fullDateStr = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
$('headerDate').textContent = dateText(fullDateStr);
  today();
  schedule();
  pursuits();
  challenges();
  reminders();
  history();
  // Only render calendar if calendar tab is active
  if (document.getElementById('calendar').classList.contains('active')) {
    renderCalendar();
  }
}
function today(){let a=tasks(),n=now(),c=a.find(x=>n>=min(x.start)&&n<min(x.end))||a.find(x=>min(x.start)>n);if(c&&n>=min(c.start)&&n<min(c.end)&&c.id!==lastNotified){playSound();lastNotified=c.id}if(c){let s=ts(c.id);$('current').innerHTML='<div class="currentName">'+esc(c.name)+'</div><div class="muted">'+tt(c.start)+' — '+tt(c.end)+'</div>'+(c.details?'<div class="details">'+esc(c.details)+'</div>':'')+(s.note?'<div class="note">Note: '+esc(s.note)+'</div>':'')+'<div class="actionsNow"><button class="primary" onclick="toggleTask(\''+c.id+'\')">'+(s.done?'✓ Completed':'Mark as done')+'</button><button onclick="openNote(\'task\',\''+c.id+'\')">'+(s.note?'Edit note':'Add note')+'</button></div>'}else $('current').innerHTML='<div class="currentName">'+(a.length?'No current task':'No scheduled tasks')+'</div><div class="muted">'+(a.length?'Your next task will appear here.':'Add tasks in Schedule.')+'</div>'; $('todayTasks').innerHTML=a.length?a.map(taskRow).join(''):'<div class="empty">No scheduled tasks.</div>';let p=data.pursuits;$('todayPursuits').innerHTML=p.length?p.map(pursuitRow).join(''):'<div class="empty">No daily pursuits.</div>';let ac=data.challenges.filter(c=>!c.completed&&todayKey()>=c.start&&todayKey()<=c.end);$('todayChallenges').innerHTML=ac.length?ac.map(c=>challengeToday(c)).join(''):'<div class="empty">No active personal challenges today.</div>'}
function taskRow(t){let s=ts(t.id);return '<div class="row"><button class="circle '+(s.done?'done':'')+'" onclick="toggleTask(\''+t.id+'\')">'+(s.done?'✓':'')+'</button><div class="time">'+tt(t.start)+'</div><div class="main"><div class="name '+(s.done?'done':'')+'">'+esc(t.name)+'</div>'+(t.details?'<div class="details">'+esc(t.details)+'</div>':'')+(s.note?'<div class="note">Note: '+esc(s.note)+'</div>':'')+'</div><button class="edit" onclick="openNote(\'task\',\''+t.id+'\')">'+(s.note?'Note':'+')+'</button></div>'}
function pursuitRow(p){let s=ps(p.id);return '<div class="row"><button class="circle '+(s.done?'done':'')+'" onclick="togglePursuit(\''+p.id+'\')">'+(s.done?'✓':'')+'</button><div class="main"><div class="name '+(s.done?'done':'')+'">'+esc(p.name)+'</div>'+(p.details?'<div class="details">'+esc(p.details)+'</div>':'')+(s.note?'<div class="note">Note: '+esc(s.note)+'</div>':'')+'</div><button class="edit" onclick="openNote(\'pursuit\',\''+p.id+'\')">'+(s.note?'Note':'+')+'</button></div>'}
const weekNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function scheduleForWeekday(w){let items=[];data.tasks.forEach(t=>{let s=t.schedule||{};if(s.type==='daily'){let o=data.taskOverrides[t.id]?.[w];if(!o?.deleted)items.push(o?{...t,...o,parentId:t.id,weekday:w}:{...t,parentId:t.id,weekday:w})}else if(s.type==='weekday'&&+s.weekday===w)items.push({...t,weekday:w});else if(s.type==='once'&&s.date>=todayKey()&&weekday(s.date)===w)items.push({...t,weekday:w})});return items.sort((a,b)=>a.start.localeCompare(b.start))}
function scheduleRow(t,w){let s=t.schedule||{},tag=t.parentId?'Every day · '+weekNames[w]+' override':s.type==='daily'?'Every day':s.type==='weekday'?'Every '+weekNames[w]:s.type==='once'?'One time · '+short(s.date):'Needs a recurrence';return '<div class="row scheduleRow"><div class="time">'+tt(t.start)+'</div><div class="main"><div class="name">'+esc(t.name)+'</div><div class="meta">'+tag+'</div>'+(t.details?'<div class="details">'+esc(t.details)+'</div>':'')+'</div><button class="edit" onclick="editTask(\''+(t.parentId||t.id)+'\','+w+')">Edit</button><button class="edit" onclick="deleteScheduleTask(\''+(t.parentId||t.id)+'\','+w+')">Delete</button></div>'}
// Calendar functions
function renderCalendar() {
  const year = calendarView.getFullYear();
  const month = calendarView.getMonth();
  
  $('calendarMonth').textContent = new Intl.DateTimeFormat(undefined, { 
    month: 'long', 
    year: 'numeric' 
  }).format(calendarView);
  
  // Get first day of month (0=Sunday, adjust so Monday=0)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
  
  let html = '<div class="calendarWeekdays">';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    html += '<div class="calendarWeekday">' + d + '</div>';
  });
  html += '</div><div class="calendarDays">';
  
  // Empty cells before first day
  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  for (let i = 0; i < offset; i++) {
    html += '<div class="calendarDay empty"></div>';
  }
  
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const isToday = dateStr === todayStr;
    const events = data.calendarEvents[dateStr] || [];
    const hasEvents = events.length > 0;
    
    html += '<div class="calendarDay' + (isToday ? ' today' : '') + (hasEvents ? ' hasEvents' : '') + '" data-date="' + dateStr + '">';
    html += '<div class="calendarDayNumber">' + d + '</div>';
    if (hasEvents) {
      html += '<div class="calendarDayDots">';
      events.slice(0, 2).forEach(e => {
        html += '<span class="calendarDayDot"></span>';
      });
      if (events.length > 2) html += '<span class="calendarDayDot more">+</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  
  html += '</div>';
  $('calendarGrid').innerHTML = html;
  
  // Click handlers for days
  document.querySelectorAll('.calendarDay:not(.empty)').forEach(el => {
    el.onclick = () => showDayEvents(el.dataset.date);
  });
  
  // Show events for today by default, or first day with events
  if (data.calendarEvents[todayStr] && data.calendarEvents[todayStr].length > 0) {
    showDayEvents(todayStr);
  } else {
    // Find first day with events in current month
    let found = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      if (data.calendarEvents[dateStr] && data.calendarEvents[dateStr].length > 0) {
        showDayEvents(dateStr);
        found = true;
        break;
      }
    }
    if (!found) {
      $('calendarEvents').innerHTML = '<div class="empty">Click a date to add an event.</div>';
    }
  }
}

function showDayEvents(dateStr) {
  const events = data.calendarEvents[dateStr] || [];
  const dateObj = new Date(dateStr + 'T12:00:00');
  const dateDisplay = new Intl.DateTimeFormat(undefined, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }).format(dateObj);
  
  let html = '<div class="calendarDayEvents"><div class="calendarDayEventsHead">';
  html += '<h3>' + dateDisplay + '</h3>';
  html += '<button onclick="addCalendarEvent(\'' + dateStr + '\')">+ Add event</button>';
  html += '</div>';
  
  if (events.length === 0) {
    html += '<div class="empty">No events on this date.</div>';
  } else {
    html += '<div class="calendarEventList">';
    events.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    events.forEach((e, idx) => {
      html += '<div class="row calendarEventRow">';
      html += '<div class="main">';
      html += '<div class="name">' + esc(e.name) + '</div>';
      if (e.time) html += '<div class="time">' + tt(e.time) + '</div>';
      if (e.note) html += '<div class="note">' + esc(e.note) + '</div>';
      html += '</div>';
      html += '<button class="edit" onclick="editCalendarEvent(\'' + dateStr + '\',' + idx + ')">Edit</button>';
      html += '<button class="edit" onclick="deleteCalendarEvent(\'' + dateStr + '\',' + idx + ')">Delete</button>';
      html += '</div>';
    });
    html += '</div>';
  }
  
  html += '</div>';
  $('calendarEvents').innerHTML = html;
}

function addCalendarEvent(dateStr) {
  $('calendarEventId').value = '';
  $('calendarEventDate').value = dateStr;
  $('calendarEventName').value = '';
  $('calendarEventTime').value = '';
  $('calendarEventNote').value = '';
  $('calendarEventTitle').textContent = 'Add Event';
  $('delCalendarEvent').classList.add('hidden');
  $('calendarEventDlg').showModal();
}

function editCalendarEvent(dateStr, idx) {
  const events = data.calendarEvents[dateStr] || [];
  const e = events[idx];
  if (!e) return;
  $('calendarEventId').value = idx;
  $('calendarEventDate').value = dateStr;
  $('calendarEventName').value = e.name;
  $('calendarEventTime').value = e.time || '';
  $('calendarEventNote').value = e.note || '';
  $('calendarEventTitle').textContent = 'Edit Event';
  $('delCalendarEvent').classList.remove('hidden');
  $('calendarEventDlg').showModal();
}

function deleteCalendarEvent(dateStr, idx) {
  if (!confirm('Delete this event?')) return;
  const events = data.calendarEvents[dateStr] || [];
  events.splice(idx, 1);
  if (events.length === 0) {
    delete data.calendarEvents[dateStr];
  }
  save();
  renderCalendar();
  $('calendarEventDlg').close();
}
function toggleScheduleDay(w){scheduleOpen[w]=!(scheduleOpen[w]!==false);render()}
function schedule(){let weekdays=weekNames.map((name,w)=>{let open=scheduleOpen[w]!==false,items=scheduleForWeekday(w);return '<div class="scheduleDay"><div class="head scheduleDayHead"><h2>'+name+'</h2><button onclick="toggleScheduleDay('+w+')" aria-expanded="'+open+'">'+(open?'−':'＋')+'</button></div>'+(open?(items.length?items.map(t=>scheduleRow(t,w)).join(''):'<div class="empty">No scheduled items.</div>'):'')+'</div>'}).join(''),legacy=data.tasks.filter(t=>(t.schedule||{}).type==='unscheduled');$('scheduleList').innerHTML=weekdays+(legacy.length?'<div class="scheduleDay"><div class="sub">UNSCHEDULED EXISTING ITEMS</div>'+legacy.map(t=>'<div class="row scheduleRow"><div class="main"><div class="name">'+esc(t.name)+'</div><div class="meta">Choose a recurrence or date to schedule this item.</div></div><button class="edit" onclick="editTask(\''+t.id+'\')">Edit</button></div>').join('')+'</div>':'')}
function pursuits(){$('pursuitList').innerHTML=data.pursuits.map(p=>'<div class="row"><div class="main"><div class="name">'+esc(p.name)+'</div><div class="details">'+(esc(p.details)||'No description added.')+'</div></div><button class="edit" onclick="editPursuit(\''+p.id+'\')">Edit</button></div>').join('')||'<div class="empty">No daily pursuits.</div>'}
function reminders(){let sections={todo:'remindersTodo',buy:'remindersBuy',ideas:'remindersIdeas'},empty={todo:'No to-do reminders.',buy:'No shopping reminders.',ideas:'No ideas yet.'};Object.entries(sections).forEach(([category,id])=>{let items=data.reminders.filter(r=>r.category===category&&(!r.completedOn||r.completedOn===todayKey()));$(id).innerHTML=items.length?items.map(reminderRow).join(''):'<div class="empty">'+empty[category]+'</div>'})}
function reminderRow(r){let done=r.completedOn===todayKey();return '<div class="row reminderRow"><button class="circle '+(done?'done':'')+'" aria-label="'+(done?'Undo':'Complete')+' '+esc(r.name)+'" onclick="toggleReminder(\''+r.id+'\')">'+(done?'✓':'')+'</button><div class="main"><div class="name '+(done?'done':'')+'">'+esc(r.name)+'</div>'+(done?'<div class="meta">Completed today</div>':'')+'</div><button class="edit" onclick="editReminder(\''+r.id+'\')">Edit</button><button class="edit" onclick="deleteReminder(\''+r.id+'\')">Delete</button></div>'}
function total(c){return Math.max(1,Math.round((D(c.end)-D(c.start))/86400000)+1)}function elapsed(c){let k=todayKey();if(k<c.start)return 0;if(k>c.end)return total(c);return Math.round((D(k)-D(c.start))/86400000)+1}function count(c){return Object.values(data.days).filter(x=>x.challenges?.[c.id]?.done).length}
function challengeToday(c){let s=cs(c.id);return '<div class="challenge"><div class="challengeTitle">'+esc(c.name)+'</div><div class="challengeDates">'+short(c.start)+' — '+short(c.end)+' · Day '+elapsed(c)+' of '+total(c)+'</div>'+(c.target?'<div class="details">Daily target: '+esc(c.target)+'</div>':'')+'<div class="bar"><div class="fill" style="width:'+Math.round(elapsed(c)/total(c)*100)+'%"></div></div><div class="meta">'+(s.done?'✓ Today completed':'Today not completed')+'</div><div class="challengeBtns"><button class="primary" onclick="toggleChallenge(\''+c.id+'\')">'+(s.done?'Undo today':'Complete today')+'</button><button onclick="checkin(\''+c.id+'\')">Comment</button></div></div>'}
function isPast(c){return c.completed||c.end<todayKey()}function pastYear(c){return c.end.slice(0,4)}
function challenges(){let active=data.challenges.filter(c=>!isPast(c)),past=data.challenges.filter(isPast),years=[...new Set(past.map(pastYear))].sort((a,b)=>b.localeCompare(a));$('activeChallenges').innerHTML=active.length?active.map(challengeCard).join(''):'<div class="empty">No active challenges. Create one to get started.</div>';$('pastChallenges').innerHTML=years.length?years.map(y=>pastYearBlock(y,past.filter(c=>pastYear(c)===y))).join(''):'<div class="empty">No past challenges yet.</div>'}
function pastYearBlock(year,items){let open=!!pastOpen[year],completed=items.filter(c=>c.completed).length;return '<div class="challenge"><div class="challengeBtns"><button class="primary" onclick="togglePastYear(\''+year+'\')" aria-expanded="'+open+'">'+(open?'−':'＋')+' '+year+'</button><button onclick="openReport(\''+year+'\')">Yearly report</button></div><div class="meta">'+items.length+' challenges · '+completed+' completed</div>'+(open?'<div class="pastList">'+items.map(pastChallengeCard).join('')+'</div>':'')+'</div>'}
function pastChallengeCard(c){return '<div class="historyItem"><b>'+esc(c.name)+'</b> <span class="meta">'+(c.completed?'COMPLETED':'NOT COMPLETED')+'</span><div class="historyNote">'+short(c.start)+' — '+short(c.end)+(c.description?'\n'+esc(c.description):'')+'</div><div class="challengeBtns"><button onclick="reuseChallenge(\''+c.id+'\')">Reuse</button><button class="danger" onclick="deletePastChallenge(\''+c.id+'\')">Delete</button></div></div>'}
function togglePastYear(year){pastOpen[year]=!pastOpen[year];render()}
function challengeCard(c){let T=total(c),n=count(c),p=Math.min(100,Math.round(n/T*100)),dots='';for(let i=0;i<T;i++){let d=D(c.start);d.setDate(d.getDate()+i),k=key(d),s=data.days[k]?.challenges?.[c.id];dots+='<span class="day '+(s?.done?'done ':'')+(k===todayKey()?'today':'')+'">'+(i+1)+'</span>'}return '<div class="challenge"><div class="challengeTitle">'+esc(c.name)+'</div><div class="challengeDates">'+dateText(c.start)+' — '+dateText(c.end)+' · Day '+elapsed(c)+' of '+T+'</div>'+(c.description?'<div class="details">'+esc(c.description)+'</div>':'')+(c.target?'<div class="details">Daily target: '+esc(c.target)+'</div>':'')+'<div class="bar"><div class="fill" style="width:'+p+'%"></div></div><div class="meta">'+n+' of '+T+' days completed · '+p+'%</div><div class="days">'+dots+'</div><div class="challengeBtns"><button class="primary" onclick="checkin(\''+c.id+'\')">Today\'s check-in</button><button onclick="editChallenge(\''+c.id+'\')">Edit</button>'+(todayKey()>=c.end?'<button onclick="finish(\''+c.id+'\')">Finish & record result</button>':'')+'</div></div>'}
function completedCard(c){return '<div class="challenge"><div class="challengeTitle">'+esc(c.name)+' <span class="meta">COMPLETED</span></div><div class="challengeDates">'+dateText(c.start)+' — '+dateText(c.end)+' · '+total(c)+' days</div><div class="meta">'+count(c)+' of '+total(c)+' days completed</div>'+(c.final?'<div class="result"><b>Final accomplishment</b>\n'+esc(c.final)+'</div>':'')+'<div class="challengeBtns"><button onclick="editChallenge(\''+c.id+'\')">Edit</button></div></div>'}
function setTaskTypeFields(){let type=$('taskType').value;$('taskWeekdayField').classList.toggle('hidden',type!=='weekday');$('taskDateField').classList.toggle('hidden',type!=='once');$('taskDate').required=type==='once'}
function editTask(id,w){openTask(id,w)}function openTask(id,w){let t=id&&data.tasks.find(x=>x.id===id),o=t&&w!==undefined&&t.schedule?.type==='daily'?data.taskOverrides[t.id]?.[w]:null,source=o&&!o.deleted?{...t,...o}:t;$('taskId').value=t?.id||'';$('taskEditWeekday').value=w??'';$('taskName').value=source?.name||'';$('taskStart').value=source?.start||'09:00';$('taskEnd').value=source?.end||'09:30';$('taskDetails').value=source?.details||'';$('taskTitle').textContent=t?(w!==undefined&&t.schedule?.type==='daily'?'Edit '+weekNames[w]+' schedule':'Edit task'):'Add task';$('taskTypeField').classList.toggle('hidden',w!==undefined&&t?.schedule?.type==='daily');$('taskWeekdayField').classList.toggle('hidden',w!==undefined&&t?.schedule?.type==='daily');$('taskDateField').classList.toggle('hidden',w!==undefined&&t?.schedule?.type==='daily');$('taskType').value=t?.schedule?.type==='weekday'?'weekday':t?.schedule?.type==='once'?'once':'daily';$('taskWeekday').value=t?.schedule?.weekday??w??0;$('taskDate').value=t?.schedule?.date||todayKey();setTaskTypeFields();if(w!==undefined&&t?.schedule?.type==='daily'){$('taskWeekdayField').classList.add('hidden');$('taskDateField').classList.add('hidden')}$('delTask').classList.toggle('hidden',!t);$('taskDlg').showModal()}
$('taskType').onchange=setTaskTypeFields;
$('taskForm').onsubmit=e=>{e.preventDefault();if(min($('taskEnd').value)<=min($('taskStart').value))return alert('End time must be after start time.');let id=$('taskId').value,scope=$('taskEditWeekday').value,name=$('taskName').value.trim(),fields={name,start:$('taskStart').value,end:$('taskEnd').value,details:$('taskDetails').value.trim()};if(id&&scope!==''&&data.tasks.find(t=>t.id===id)?.schedule?.type==='daily'){data.taskOverrides[id]??={};data.taskOverrides[id][scope]={id:data.taskOverrides[id][scope]?.id||uid('to'),...fields}}else{let type=$('taskType').value,task={id:id||uid('t'),...fields,schedule:{type}};if(type==='weekday')task.schedule.weekday=+$('taskWeekday').value;if(type==='once')task.schedule.date=$('taskDate').value;let i=data.tasks.findIndex(t=>t.id===task.id);i<0?data.tasks.push(task):data.tasks[i]=task}save();$('taskDlg').close();render()}
function deleteScheduleTask(id,w){let t=data.tasks.find(x=>x.id===id);if(!t)return;if(t.schedule?.type==='daily'&&w!==undefined){if(!confirm('Remove this task from '+weekNames[w]+' schedules? Other weekdays will stay unchanged.'))return;data.taskOverrides[id]??={};data.taskOverrides[id][w]={id:data.taskOverrides[id][w]?.id||uid('to'),deleted:true}}else{if(!confirm('Delete this schedule item?'))return;let overrideIds=Object.values(data.taskOverrides[id]||{}).map(o=>o.id);data.tasks=data.tasks.filter(x=>x.id!==id);delete data.taskOverrides[id];Object.values(data.days).forEach(d=>{delete d.tasks?.[id];overrideIds.forEach(oid=>delete d.tasks?.[oid])})}save();render()}
$('delTask').onclick=()=>{let id=$('taskId').value,w=$('taskEditWeekday').value;if(id)deleteScheduleTask(id,w===''?undefined:+w);$('taskDlg').close()}
function editPursuit(id){openPursuit(id)}function openPursuit(id){let p=id&&data.pursuits.find(x=>x.id===id);$('pursuitId').value=p?.id||'';$('pursuitName').value=p?.name||'';$('pursuitDetails').value=p?.details||'';$('pursuitTitle').textContent=p?'Edit pursuit':'Add pursuit';$('delPursuit').classList.toggle('hidden',!p);$('pursuitDlg').showModal()}
$('pursuitForm').onsubmit=e=>{e.preventDefault();let id=$('pursuitId').value||uid('p'),x={id,name:$('pursuitName').value.trim(),details:$('pursuitDetails').value.trim()},i=data.pursuits.findIndex(p=>p.id===id);i<0?data.pursuits.push(x):data.pursuits[i]=x;save();$('pursuitDlg').close();render()}
$('delPursuit').onclick=()=>{let id=$('pursuitId').value;if(confirm('Delete this pursuit?')){data.pursuits=data.pursuits.filter(x=>x.id!==id);Object.values(data.days).forEach(d=>delete d.pursuits?.[id]);save();$('pursuitDlg').close();render()}}
function openNote(type,id){let s=type==='task'?ts(id):ps(id);$('noteType').value=type;$('noteId').value=id;$('noteText').value=s.note||'';$('noteDlg').showModal()}
$('noteForm').onsubmit=e=>{e.preventDefault();let s=$('noteType').value==='task'?ts($('noteId').value):ps($('noteId').value);s.note=$('noteText').value.trim();save();$('noteDlg').close();render()}
function editChallenge(id){openChallenge(id)}function openChallenge(id){let c=id&&data.challenges.find(x=>x.id===id);$('challengeId').value=c?.id||'';$('challengeName').value=c?.name||'';$('challengeDescription').value=c?.description||'';$('challengeStart').value=c?.start||todayKey();$('challengeEnd').value=c?.end||todayKey();$('challengeTarget').value=c?.target||'';$('challengeTitle').textContent=c?'Edit challenge':'Add challenge';$('delChallenge').classList.toggle('hidden',!c);$('challengeDlg').showModal()}
function reuseChallenge(id){let c=data.challenges.find(x=>x.id===id);if(!c)return;openChallenge();$('challengeName').value=c.name;$('challengeDescription').value=c.description||'';$('challengeStart').value=todayKey();$('challengeEnd').value=todayKey()}
function deletePastChallenge(id){let c=data.challenges.find(x=>x.id===id);if(!c||!isPast(c))return;if(confirm('Delete this past challenge? This permanently removes only this challenge attempt and its check-ins.')){data.challenges=data.challenges.filter(x=>x.id!==id);Object.values(data.days).forEach(d=>delete d.challenges?.[id]);save();render()}}
$('challengeForm').onsubmit=e=>{e.preventDefault();let s=$('challengeStart').value,en=$('challengeEnd').value;if(en<s)return alert('End date must be on or after start date.');let id=$('challengeId').value||uid('c'),old=data.challenges.find(x=>x.id===id),x={id,name:$('challengeName').value.trim(),description:$('challengeDescription').value.trim(),start:s,end:en,target:$('challengeTarget').value.trim(),completed:old?.completed||false,final:old?.final||''},i=data.challenges.findIndex(c=>c.id===id);i<0?data.challenges.push(x):data.challenges[i]=x;save();$('challengeDlg').close();render()}
$('delChallenge').onclick=()=>{let id=$('challengeId').value;if(confirm('Delete this challenge?')){data.challenges=data.challenges.filter(x=>x.id!==id);Object.values(data.days).forEach(d=>delete d.challenges?.[id]);save();$('challengeDlg').close();render()}}
function checkin(id){let c=data.challenges.find(x=>x.id===id),s=cs(id);$('checkId').value=id;$('checkTitle').textContent=c.name;$('checkComment').value=s.comment||'';$('checkDone').checked=s.done;$('checkDlg').showModal()}
$('checkForm').onsubmit=e=>{e.preventDefault();let s=cs($('checkId').value);s.comment=$('checkComment').value.trim();s.done=$('checkDone').checked;save();$('checkDlg').close();render()}
function toggleChallenge(id){let s=cs(id);s.done=!s.done;save();render()}
function finish(id){let c=data.challenges.find(x=>x.id===id);$('finishId').value=id;$('finishText').value=c.final||'';$('finishDlg').showModal()}
$('finishForm').onsubmit=e=>{e.preventDefault();let c=data.challenges.find(x=>x.id===$('finishId').value);c.final=$('finishText').value.trim();c.completed=true;save();$('finishDlg').close();render()}
function openReport(year){let items=data.challenges.filter(c=>isPast(c)&&pastYear(c)===year),completed=items.filter(c=>c.completed).length;$('reportYear').value=year;$('reportTitle').textContent=year+' challenge report';$('reportSummary').textContent=items.length+' past challenges: '+completed+' completed and '+(items.length-completed)+' not completed.';$('reportJournal').value=data.challengeJournals[year]||'';$('deleteYear').classList.toggle('hidden',!data.exportedChallengeYears[year]);$('reportDlg').showModal()}
function pdfEscape(text){return String(text||'').replace(/[^\x20-\x7e]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrapPdf(text,width=78){let words=pdfEscape(text).split(/\s+/),lines=[],line='';words.forEach(word=>{if((line+' '+word).trim().length>width){if(line)lines.push(line);line=word}else line=(line+' '+word).trim()});if(line)lines.push(line);return lines}
function makePdfPage(lines){let y=750,out='BT /F1 11 Tf 50 '+y+' Td ';lines.forEach((line,i)=>{out+='('+pdfEscape(line)+') Tj';if(i<lines.length-1)out+=' 0 -16 Td'});return out+' ET'}
function exportYearPdf(year){let items=data.challenges.filter(c=>isPast(c)&&pastYear(c)===year),done=items.filter(c=>c.completed).length,journal=$('reportJournal').value.trim();data.challengeJournals[year]=journal;data.exportedChallengeYears[year]=true;save();let lines=['MY DAY - '+year+' CHALLENGE REPORT','',items.length+' challenges completed: '+done+'   Not completed: '+(items.length-done),'','CHALLENGES'];items.forEach(c=>{lines.push(...wrapPdf((c.completed?'[Completed] ':'[Not completed] ')+c.name+' - '+c.start+' to '+c.end));if(c.description)lines.push(...wrapPdf('  '+c.description));if(c.final)lines.push(...wrapPdf('  Final accomplishment: '+c.final));lines.push('')});lines.push('YEARLY REFLECTION',...wrapPdf(journal||'No reflection recorded.'));let pages=[];while(lines.length)pages.push(makePdfPage(lines.splice(0,41)));pages.push(makePdfPage(['MY DAY','',year+' CHALLENGE EFFORT CERTIFICATE','', 'This certificate celebrates your willingness to set goals,','show up, reflect, and keep growing.','', 'Every challenge is part of the work.','', 'Congratulations on your year of effort.']));let objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids ['+pages.map((_,i)=>(4+i*2)+' 0 R').join(' ')+'] /Count '+pages.length+' >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];pages.forEach((stream,i)=>{let page=4+i*2,content=page+1;objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+content+' 0 R >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream')});let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n'});let xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';let url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download='my-day-'+year+'-challenge-report.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('deleteYear').classList.remove('hidden')}
$('reportForm').onsubmit=e=>{e.preventDefault();exportYearPdf($('reportYear').value)}
$('deleteYear').onclick=()=>{let year=$('reportYear').value;if(confirm('Permanently delete all '+year+' past challenge history? This cannot be undone. Export the yearly PDF first so you keep a record. Active challenges, reused challenges that are still active, and other years will not be affected.')){let ids=new Set(data.challenges.filter(c=>isPast(c)&&pastYear(c)===year).map(c=>c.id));data.challenges=data.challenges.filter(c=>!ids.has(c.id));Object.values(data.days).forEach(d=>ids.forEach(id=>delete d.challenges?.[id]));delete data.challengeJournals[year];delete data.exportedChallengeYears[year];save();$('reportDlg').close();render()}}
function toggleTask(id){let s=ts(id);s.done=!s.done;save();render()}function togglePursuit(id){let s=ps(id);s.done=!s.done;save();render()}
function reminderHistory(id){return Object.values(data.days).flatMap(d=>d.reminders||[]).filter(r=>r.id===id)}
function toggleReminder(id){let r=data.reminders.find(r=>r.id===id);if(!r)return;if(r.completedOn===todayKey()){delete r.completedOn;day().reminders=day().reminders.filter(x=>x.id!==id)}else if(!r.completedOn){r.completedOn=todayKey();day().reminders.push({id:r.id,name:r.name,category:r.category,done:true})}save();render()}
function editReminder(id){let r=data.reminders.find(r=>r.id===id);if(!r)return;$('reminderId').value=r.id;$('reminderName').value=r.name;$('reminderCategory').value=r.category;$('reminderTitle').textContent='Edit reminder';$('reminderDlg').showModal()}
function deleteReminder(id){let r=data.reminders.find(r=>r.id===id);if(!r)return;if(confirm('Delete this reminder?')){data.reminders=data.reminders.filter(x=>x.id!==id);Object.values(data.days).forEach(d=>d.reminders&&(d.reminders=d.reminders.filter(x=>x.id!==id)));save();render()}}
$('reminderForm').onsubmit=e=>{e.preventDefault();let id=$('reminderId').value,r=data.reminders.find(r=>r.id===id),name=$('reminderName').value.trim(),category=$('reminderCategory').value;if(r){r.name=name;r.category=category;reminderHistory(r.id).forEach(x=>{x.name=name;x.category=category})}else data.reminders.push({id:uid('r'),name,category});save();$('reminderDlg').close();render()}
// Calendar form handler
$('calendarEventForm').onsubmit = e => {
  e.preventDefault();
  const dateStr = $('calendarEventDate').value;
  const idx = $('calendarEventId').value;
  const name = $('calendarEventName').value.trim();
  const time = $('calendarEventTime').value;
  const note = $('calendarEventNote').value.trim();
  
  if (!name) return alert('Please enter an event title.');
  
  if (!data.calendarEvents[dateStr]) {
    data.calendarEvents[dateStr] = [];
  }
  
  const event = { name, time, note };
  
  if (idx === '') {
    data.calendarEvents[dateStr].push(event);
  } else {
    data.calendarEvents[dateStr][parseInt(idx)] = event;
  }
  
  save();
  $('calendarEventDlg').close();
  renderCalendar();
};

$('delCalendarEvent').onclick = () => {
  const dateStr = $('calendarEventDate').value;
  const idx = parseInt($('calendarEventId').value);
  deleteCalendarEvent(dateStr, idx);
};
$('addTask').onclick=()=>openTask();$('addPursuit').onclick=()=>openPursuit();$('addChallenge').onclick=()=>openChallenge();document.querySelectorAll('.reminderAdd').forEach(b=>b.onclick=()=>{$('reminderId').value='';$('reminderName').value='';$('reminderCategory').value=b.dataset.category;$('reminderTitle').textContent='Add reminder';$('reminderDlg').showModal()});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('prev').onclick=()=>{let d=D(hist);d.setDate(d.getDate()-1);hist=key(d);render()};$('next').onclick=()=>{let d=D(hist);d.setDate(d.getDate()+1);hist=key(d);render()};$('historyDate').onchange=e=>{hist=e.target.value;render()}
// Calendar navigation
$('calendarPrev').onclick = () => {
  calendarView.setMonth(calendarView.getMonth() - 1);
  renderCalendar();
};

$('calendarNext').onclick = () => {
  calendarView.setMonth(calendarView.getMonth() + 1);
  renderCalendar();
};
function history(){ $('historyTitle').textContent=dateText(hist);$('historyDate').value=hist;let r=data.days[hist];if(!r){$('historyContent').innerHTML='<div class="empty">No activity recorded for '+esc(dateText(hist))+'.</div>';return}let a=tasks(hist).map(t=>{let s=r.tasks?.[t.id]||{};return '<div class="historyItem">'+(s.done?'✓':'○')+' '+esc(t.name)+'<div class="historyNote">'+tt(t.start)+' — '+tt(t.end)+(t.details?'\n'+esc(t.details):'')+(s.note?'\nNote: '+esc(s.note):'')+'</div></div>'}).join(''),p=data.pursuits.map(x=>{let s=r.pursuits?.[x.id]||{};return '<div class="historyItem">'+(s.done?'✓':'○')+' '+esc(x.name)+(s.note?'<div class="historyNote">Note: '+esc(s.note)+'</div>':'')+'</div>'}).join(''),c=data.challenges.filter(x=>r.challenges?.[x.id]).map(x=>{let s=r.challenges[x.id];return '<div class="historyItem">'+(s.done?'✓':'○')+' '+esc(x.name)+(s.comment?'<div class="historyNote">'+esc(s.comment)+'</div>':'')+'</div>'}).join(''),m=(r.reminders||[]).map(x=>'<div class="historyItem">✓ '+esc(x.name)+'<div class="historyNote">'+esc({todo:'To Do',buy:'To Buy',ideas:'Ideas'}[x.category]||'Reminders')+'</div></div>').join('');$('historyContent').innerHTML='<div class="historyBlock"><small>SCHEDULED TASKS</small>'+a+'</div><div class="historyBlock"><small>DAILY PURSUITS</small>'+p+'</div><div class="historyBlock"><small>PERSONAL CHALLENGES</small>'+c+'</div><div class="historyBlock"><small>REMINDERS COMPLETED</small>'+m+'</div>'}
render();setInterval(()=>{render()},30000);
