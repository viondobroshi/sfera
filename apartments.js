'use strict';
const propertyKey=new URLSearchParams(location.search).get('property')||'pca';
let property;
const roomDialog=document.getElementById('room-dialog');
const lightbox=document.getElementById('lightbox');
const cache=new Map();
let currentRoom=null,currentPhotos=[],photoIndex=0,requestNumber=0;
function closeRoom(){requestNumber++;roomDialog.close();}
document.getElementById('close-room').addEventListener('click',closeRoom);
roomDialog.addEventListener('cancel',()=>{requestNumber++;});
document.getElementById('close-lightbox').addEventListener('click',()=>lightbox.close());
function showPhoto(index){photoIndex=(index+currentPhotos.length)%currentPhotos.length;const img=document.getElementById('large-photo');img.src=currentPhotos[photoIndex].src;img.alt=currentRoom.name+' — photo '+(photoIndex+1);document.getElementById('photo-caption').textContent=currentRoom.name+' · '+(photoIndex+1)+' / '+currentPhotos.length;}
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
  document.getElementById('group-note').hidden=!room.shared;
  document.getElementById('group-note').textContent=room.name.includes('&')?'This collection covers both room numbers. Our team will confirm your assigned room.':'Property photography is shown; our team will confirm the exact room details.';
  document.getElementById('room-enquiry').onclick=()=>window.SferaBooking.open(property.id,room.value);
  const grid=document.getElementById('photo-grid');grid.replaceChildren();
  const status=document.getElementById('room-status');status.textContent='Loading photos…';roomDialog.showModal();
  try{
    if(room.photos)cache.set(room.id,{photos:room.photos});
    if(!cache.has(room.id)){const response=await fetch('/photos/'+room.id+'.json');if(!response.ok)throw new Error('Photo request failed');cache.set(room.id,await response.json());}
    if(request!==requestNumber||!roomDialog.open)return;
    const data=cache.get(room.id);currentPhotos=data.photos;
    currentPhotos.forEach((photo,index)=>{const button=document.createElement('button');button.setAttribute('aria-label','Enlarge '+room.name+' photo '+(index+1));const img=document.createElement('img');img.src=photo.src;img.alt=room.name+' — photo '+(index+1);img.width=photo.width;img.height=photo.height;img.loading=index?'lazy':'eager';img.decoding='async';button.append(img);button.addEventListener('click',()=>{showPhoto(index);lightbox.showModal();});grid.append(button);});
    status.textContent=currentPhotos.length+' photos';
  }catch(error){if(request===requestNumber)status.textContent='We couldn’t load these photos. Please close this gallery and try again.';}
}
async function loadRooms(){
  const status=document.getElementById('gallery-status');
  try{
    const response=await fetch('/properties.json');if(!response.ok)throw new Error('Catalog request failed');
    const properties=await response.json();property=properties.find(p=>p.id===propertyKey)||properties[0];
    document.title=property.name+' — Sfera';document.getElementById('property-title').textContent=property.name;document.getElementById('property-location').textContent=property.location;
    const tabs=document.getElementById('property-tabs');properties.forEach(p=>{const a=document.createElement('a');a.href='?property='+p.id;a.textContent=p.name;if(p.id===property.id)a.setAttribute('aria-current','page');tabs.append(a);});
    document.getElementById('property-enquiry').onclick=()=>window.SferaBooking.open(property.id);
    const rooms=property.rooms;
    document.getElementById('room-count').textContent=rooms.length?rooms.length+' photo collections':'Property details';
    const grid=document.getElementById('room-grid');
    if(!rooms.length){const notice=document.createElement('div');notice.className='gallery-empty';const h=document.createElement('h3');h.textContent=property.name;const p=document.createElement('p');p.textContent=property.summary+'. Photography and room details are coming soon. You can request your dates now; our team will confirm the available accommodation.';notice.append(h,p);grid.append(notice);}
    rooms.forEach(room=>{const button=document.createElement('button');button.className='room-card';button.setAttribute('aria-haspopup','dialog');const img=document.createElement('img');img.src=room.cover;img.alt=room.name;img.width=640;img.height=480;img.loading='lazy';img.decoding='async';const label=document.createElement('div');label.className='card-label';const heading=document.createElement('h3');heading.textContent=room.name;const symbol=document.createElement('span');symbol.textContent='+';symbol.setAttribute('aria-hidden','true');label.append(heading,symbol);const count=document.createElement('p');count.textContent=(room.count||room.photos.length)+' photos · View gallery';button.append(img,label,count);button.addEventListener('click',()=>openRoom(room));grid.append(button);});
    status.hidden=true;
  }catch(error){status.textContent='We couldn’t load the room galleries. Please refresh to try again.';}
}
loadRooms();
