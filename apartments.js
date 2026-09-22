'use strict';
const propertyKey=document.body.dataset.property||new URLSearchParams(location.search).get('property')||'pca';
let property;
const roomDialog=document.getElementById('room-dialog');
const lightbox=document.getElementById('lightbox');
const cache=new Map();
let currentRoom=null,currentPhotos=[],photoIndex=0,requestNumber=0;
function factList(facts,className){
 const list=document.createElement('dl');list.className=className;
 for(const [label,value] of Object.entries(facts||{})){const item=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;item.append(dt,dd);list.append(item);}
 return list;
}
const roomDetails=document.createElement('div');roomDetails.className='room-details';document.getElementById('group-note').after(roomDetails);

function closeRoom(){requestNumber++;roomDialog.close();}
document.getElementById('close-room').addEventListener('click',closeRoom);
roomDialog.addEventListener('cancel',()=>{requestNumber++;});
document.getElementById('close-lightbox').addEventListener('click',()=>lightbox.close());
function showPhoto(index){photoIndex=(index+currentPhotos.length)%currentPhotos.length;const img=document.getElementById('large-photo');img.onload=()=>{img.style.opacity='1';};img.onerror=()=>{img.style.opacity='1';document.getElementById('photo-caption').textContent='This photo could not load. Try the next photo.';};img.style.opacity='0';img.src=currentPhotos[photoIndex].src;img.alt=currentRoom.name+' — photo '+(photoIndex+1);document.getElementById('photo-caption').textContent=currentRoom.name+' · '+(photoIndex+1)+' / '+currentPhotos.length;}
document.getElementById('previous-photo').addEventListener('click',()=>showPhoto(photoIndex-1));
document.getElementById('next-photo').addEventListener('click',()=>showPhoto(photoIndex+1));
lightbox.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex-1)}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+1)}});
let touchX=null;
lightbox.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX;},{passive:true});
lightbox.addEventListener('touchend',e=>{if(touchX===null)return;const delta=e.changedTouches[0].screenX-touchX;if(Math.abs(delta)>50)showPhoto(photoIndex+(delta<0?1:-1));touchX=null;},{passive:true});
async function openRoom(room){
  const request=++requestNumber;currentRoom=room;currentPhotos=[];
  document.getElementById('room-title').textContent=room.name;
  document.getElementById('room-property').textContent=property.name;
  roomDetails.replaceChildren(factList(room.details,'room-facts'));roomDetails.hidden=!room.details;
  document.getElementById('group-note').hidden=!room.shared;
  document.getElementById('group-note').textContent=room.name.includes('&')?'This collection covers both room numbers. Our team will confirm your assigned room.':'Property photography is shown; our team will confirm the exact room details.';
  document.getElementById('room-enquiry').onclick=()=>window.SferaBooking.open(property.id,room.value);
  const grid=document.getElementById('photo-grid');grid.replaceChildren();
  const status=document.getElementById('room-status');status.textContent='Loading photos…';roomDialog.showModal();
  try{
    if(room.photos)cache.set(room.id,{photos:room.photos});
    if(!cache.has(room.id)){const response=await fetch('/photos/'+room.id+'.json');if(!response.ok)throw new Error('Photo request failed');cache.set(room.id,await response.json());}
    if(request!==requestNumber||!roomDialog.open)return;
    const data=cache.get(room.id);currentPhotos=data.photos||[];
    currentPhotos.forEach((photo,index)=>{const button=document.createElement('button');button.setAttribute('aria-label','Enlarge '+room.name+' photo '+(index+1));const img=document.createElement('img');img.src=photo.src;img.alt=room.name+' — photo '+(index+1);img.width=photo.width;img.height=photo.height;img.loading=index?'lazy':'eager';img.decoding='async';img.addEventListener('error',()=>{img.classList.add('photo-unavailable');img.alt='Photo unavailable — '+room.name;});button.append(img);button.addEventListener('click',()=>{showPhoto(index);lightbox.showModal();});grid.append(button);});
    status.textContent=currentPhotos.length?currentPhotos.length+' photos':'Room photos are coming soon. You can request this room below.';
  }catch(error){if(request===requestNumber)status.textContent='We couldn’t load these photos. Please close this gallery and try again.';}
}
async function loadRooms(){
  const status=document.getElementById('gallery-status');
  try{
    const response=await fetch('/properties.json');if(!response.ok)throw new Error('Catalog request failed');
    const properties=await response.json();property=properties.find(p=>p.id===propertyKey)||properties[0];
    document.title=property.name+' — Sfera';document.querySelector('.intro h1').textContent=property.name;document.querySelector('meta[name=description]').content='Explore '+property.name+' photos and send a booking request to Sfera.';document.getElementById('property-title').textContent=property.name;document.getElementById('property-location').textContent=property.location;
    const tabs=document.getElementById('property-tabs');properties.forEach(p=>{const a=document.createElement('a');a.href='/stays/'+p.id;a.textContent=p.name;if(p.id===property.id)a.setAttribute('aria-current','page');tabs.append(a);});
    document.getElementById('property-enquiry').onclick=()=>window.SferaBooking.open(property.id);
    const rooms=property.rooms;
    const propertyFacts=document.createElement('section');propertyFacts.className='property-facts';propertyFacts.setAttribute('aria-label','Stay information');const factsHeading=document.createElement('h2');factsHeading.textContent='Your stay';propertyFacts.append(factsHeading,factList(property.facts,'stay-facts'));document.getElementById('property-tabs').after(propertyFacts);
    document.getElementById('room-count').textContent=property.id==='hilltop'?'Entire villa':rooms.length?rooms.length+(property.id==='agara'?' rooms':' photo collections'):'Property details';
    const grid=document.getElementById('room-grid');
    if(!rooms.length){const notice=document.createElement('div');notice.className='gallery-empty';const h=document.createElement('h3');h.textContent=property.name;const p=document.createElement('p');p.textContent=property.summary+'. Photography and room details are coming soon. You can request your dates now; our team will confirm the available accommodation.';notice.append(h,p);grid.append(notice);}
    rooms.forEach(room=>{const button=document.createElement('button');button.className='room-card';button.setAttribute('aria-haspopup','dialog');const img=document.createElement(room.cover?'img':'div');if(room.cover)img.src=room.cover;else{img.className='room-photo-placeholder';img.textContent='Photos coming soon';}img.alt=room.name;img.width=640;img.height=480;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{img.classList.add('photo-unavailable');img.alt='Photo unavailable — '+room.name;});const label=document.createElement('div');label.className='card-label';const heading=document.createElement('h3');heading.textContent=room.name;const symbol=document.createElement('span');symbol.textContent='+';symbol.setAttribute('aria-hidden','true');label.append(heading,symbol);const count=document.createElement('p');const photoCount=room.count||room.photos?.length||0;count.textContent=photoCount?photoCount+' photos · View '+(property.id==='hilltop'?'villa':'room'):'View room details';const details=document.createElement('p');details.className='room-card-details';details.textContent=room.details?[room.details['Guests']+' guests',room.details['Bedrooms']?room.details['Bedrooms']+' bedrooms':room.details['Beds']].filter(Boolean).join(' · '):'';button.append(img,label,details,count);button.addEventListener('click',()=>openRoom(room));grid.append(button);});
    status.hidden=true;
  }catch(error){status.textContent='We couldn’t load the room galleries. Please refresh to try again.';}
}
loadRooms();
