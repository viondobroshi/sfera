'use strict';
window.SferaBooking=(()=>{
 const catalog=fetch('/properties.json').then(r=>{if(!r.ok)throw Error('Unable to load properties');return r.json();});
 catalog.catch(()=>{});
 let preferences={};try{preferences=JSON.parse(sessionStorage.getItem('sfera-stay-preferences')||'{}');}catch{}
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 function remember(values,out){
  if(out){out.setCustomValidity('');if(values.checkIn&&values.checkOut&&values.checkOut<=values.checkIn){out.setCustomValidity('Check-out must be after check-in.');out.reportValidity();return false;}}
  Object.assign(preferences,values);try{sessionStorage.setItem('sfera-stay-preferences',JSON.stringify(preferences));}catch{}return true;
 }
 const dialog=document.createElement('dialog');dialog.className='sfera-booking';dialog.setAttribute('aria-labelledby','booking-title');
 dialog.innerHTML=`<div class="sb-head"><div><p class="sb-eyebrow">STAY WITH SFERA</p><h2 id="booking-title">Request to book</h2></div><button type="button" class="sb-close" aria-label="Close booking request">×</button></div>
 <p class="sb-loading" role="status"></p><form class="sb-form">
 <label>Property<select name="property" required></select></label><label>Room preference<select name="room" required></select></label>
 <p class="sb-room-note sb-wide"></p>
 <label>Check-in<input name="checkIn" type="date" required></label><label>Check-out<input name="checkOut" type="date" required></label>
 <label>Guests<select name="guests">${Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1} guest${i?'s':''}</option>`).join('')}</select></label>
 <label>Your name<input name="name" autocomplete="name" required maxlength="150"></label>
 <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
 <label>WhatsApp / phone<input name="phone" type="tel" autocomplete="tel" placeholder="+383 48 123 456" required pattern="\\+[0-9 ().-]{8,20}" title="Include your country code, for example +383 48 123 456"></label>
 <label class="sb-wide">Message (optional)<textarea name="message" rows="3" maxlength="3000"></textarea></label>
 <input type="hidden" name="acknowledgementVersion" value="stay-v1"><input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="sb-trap">
 <label class="sb-consent sb-wide"><input name="privacyConsent" type="checkbox" required><span>I agree to receive a request acknowledgement and updates from Sfera by WhatsApp and email. <a href="/#privacy" target="_blank" rel="noopener">Privacy notice</a>.</span></label>
 <p class="sb-wide sb-notice">This is a booking request. Your reservation is confirmed only after the Sfera team checks availability and confirms it with you.</p>
 <p class="sb-error sb-wide" role="alert" hidden></p><button class="sb-submit sb-wide" type="submit">Send booking request</button>
 <a class="sb-fallback sb-wide" hidden target="_blank" rel="noopener">Send request on WhatsApp</a></form>
 <section class="sb-success" hidden role="status"><h3>Request received</h3><p>Our team will check availability and contact you by WhatsApp or email. Your booking is not confirmed yet.</p><dl></dl><button type="button" class="sb-done">Done</button></section>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form'),status=dialog.querySelector('.sb-loading'),error=dialog.querySelector('.sb-error'),success=dialog.querySelector('.sb-success'),submit=form.querySelector('[type="submit"]'),fallback=dialog.querySelector('.sb-fallback');
 const field=name=>form.elements.namedItem(name);
 let properties=[],busy=false,openVersion=0;
 const close=()=>{if(!busy){openVersion++;dialog.close();}};
 dialog.querySelector('.sb-close').onclick=close;dialog.querySelector('.sb-done').onclick=close;
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else openVersion++;});
 const options=(select,items)=>select.replaceChildren(...items.map(([value,label])=>new Option(label,value)));
 function rooms(value){
  const p=properties.find(p=>p.id===field('property').value);if(!p)return;
  const items=p.rooms.map(r=>[r.value,r.name]);
  options(field('room'),p.id==='hilltop'?[['Entire villa','Entire villa']]:[['No preference','No room preference'],...items]);
  field('room').value=items.some(x=>x[0]===value)?value:p.id==='hilltop'?'Entire villa':'No preference';
  roomNote();
 }
 function roomNote(){const p=properties.find(p=>p.id===field('property').value);const r=p?.rooms.find(r=>r.value===field('room').value);dialog.querySelector('.sb-room-note').textContent=r?.name.includes('&')?'This photo collection covers both room numbers. Our team will confirm your assigned room.':!p?.rooms.length?'Our team will confirm the available accommodation for your dates.':'';}
 field('property').onchange=()=>{rooms();error.hidden=true;fallback.hidden=true;};field('room').onchange=roomNote;
 function dates(){const cin=field('checkIn'),cout=field('checkOut');cin.min=today();let min=today();if(cin.value){const d=new Date(cin.value+'T12:00:00');d.setDate(d.getDate()+1);min=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}cout.min=min;cout.setCustomValidity(cout.value&&cin.value&&cout.value<=cin.value?'Check-out must be after check-in.':'');remember({checkIn:cin.value,checkOut:cout.value,guests:field('guests').value});}
 ['checkIn','checkOut','guests'].forEach(name=>field(name).addEventListener('change',dates));
 async function open(key='pri',room,values={}){
  if(busy)return;const version=++openVersion;form.hidden=true;success.hidden=true;error.hidden=true;fallback.hidden=true;status.textContent='Loading booking options…';if(!dialog.open)dialog.showModal();
  try{properties=await catalog;if(version!==openVersion)return;options(field('property'),properties.map(p=>[p.id,p.name]));field('property').value=properties.some(p=>p.id===key)?key:'pri';rooms(room);
   const saved={...preferences};for(const [k,v] of Object.entries(values))if(v)saved[k]=v;
   field('checkIn').value=saved.checkIn||'';field('checkOut').value=saved.checkOut||'';field('guests').value=/^[1-8]$/.test(saved.guests)?saved.guests:'2';dates();status.textContent='';form.hidden=false;field('checkIn').focus();
  }catch{status.textContent='We couldn’t load booking options. Please refresh and try again, or contact Sfera on WhatsApp at +383 48 101 070.';}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;dates();if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form)),property=properties.find(p=>p.id===data.property);if(!property)return;
  busy=true;submit.disabled=true;submit.textContent='Sending…';error.hidden=true;fallback.hidden=true;
  const text=['Hello Sfera, I would like to request a booking.','Property: '+property.name,'Room: '+data.room,'Check-in: '+data.checkIn,'Check-out: '+data.checkOut,'Guests: '+data.guests,'Name: '+data.name,'Email: '+data.email,'Phone: '+data.phone,'Message: '+data.message].join('\n');
  fallback.href='https://wa.me/38348101070?text='+encodeURIComponent(text);
  try{
   const response=await fetch('/api/request-stay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),result=await response.json().catch(()=>({}));
   if(!response.ok||!result.ok)throw Error(result.error||'Delivery failed');
   const summary=success.querySelector('dl');summary.replaceChildren();
   for(const [label,value] of [['Property',property.name],['Room',data.room],['Dates',data.checkIn+' → '+data.checkOut],['Guests',data.guests]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;summary.append(dt,dd);}
   form.hidden=true;success.hidden=false;form.reset();if(window.gtag)window.gtag('event','generate_lead',{lead_type:'stay',property:property.name,room:data.room});
  }catch{error.textContent='We couldn’t confirm delivery. Try again or send this request to Sfera on WhatsApp.';error.hidden=false;fallback.hidden=false;}
  finally{busy=false;submit.disabled=false;submit.textContent='Send booking request';}
 });
 document.querySelectorAll('input[type="date"]').forEach(input=>input.min=today());
 return {open,remember,catalog};
})();
