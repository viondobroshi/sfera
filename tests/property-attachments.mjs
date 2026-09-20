import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../api/submit-property.js',import.meta.url),'utf8');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
process.env.MAKE_WEBHOOK_URL='https://example.invalid/mock';
const calls=[];globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true};};
const lead={name:'Owner',email:'owner@example.com',location:'Prishtina',propertyType:'Aparthotel',privacyConsent:'on'};
async function submit(body){const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};await handler({method:'POST',body},res);return res;}
const file={name:'Property & plans.pdf',data:Buffer.from('%PDF-1.4\nTest document').toString('base64')};
assert.equal((await submit({...lead,attachment:file})).code,200);assert.deepEqual(calls.at(-1).attachment,file);assert.match(calls.at(-1).commentText,/Property & plans.pdf/);
assert.equal((await submit(lead)).code,200);assert.equal(calls.at(-1).attachment,null);
const before=calls.length;
for(const attachment of [{name:'malware.exe',data:file.data},{name:'../plans.pdf',data:file.data},{name:'plans.pdf',data:'not base64!'},{name:'plans.pdf',data:''},{name:'plans.pdf',data:Buffer.alloc(2*1024*1024+1).toString('base64')}])assert.equal((await submit({...lead,attachment})).code,400);
assert.equal((await submit({...lead,privacyConsent:''})).code,400);assert.equal(calls.length,before);
assert.equal((await submit({...lead,attachment:{name:'limit.pdf',data:Buffer.alloc(2*1024*1024).toString('base64')}})).code,200);
console.log('PASS: attachments round-trip, optional upload, type/path/base64/size checks, consent, 2 MB boundary; no real notifications sent.');
