// Preserve accepted public content while Phase 07 deliberately refines presentation.
import {createRequire} from 'node:module';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import {createJiti} from 'jiti';
const root=process.cwd(),require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const baseline='0f17ac6facb0087a6d512aa1f5ddd015657147bb',temp=fs.mkdtempSync(path.join(os.tmpdir(),'unimondo-home-defaults-'));
try{
fs.symlinkSync(root+'/node_modules',temp+'/node_modules','dir');
for(const file of execFileSync('git',['ls-tree','-r','--name-only',baseline,'src/components/home'],{encoding:'utf8'}).trim().split('\n'))fs.writeFileSync(path.join(temp,path.basename(file)),execFileSync('git',['show',baseline+':'+file]));
fs.writeFileSync(temp+'/content.ts',execFileSync('git',['show',baseline+':src/lib/homepage/content.ts']));
const alias={'@':root+'/src','next/image':root+'/scripts/fixtures/homepage-items-dom-elements.mjs','next/link':root+'/scripts/fixtures/homepage-items-dom-link.mjs'};
const oldJiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},alias:{...alias,'@/lib/homepage/content':temp+'/content.ts'},fsCache:false,moduleCache:false,tryNative:false});
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},alias,fsCache:false,moduleCache:false,tryNative:false});
const {countryDetails}=await jiti.import(root+'/src/lib/unimondo-data.ts');
const {HomePage:Old}=await oldJiti.import(temp+'/home-page.tsx'),{HomePage:Current}=await jiti.import(root+'/src/components/home/home-page.tsx'),content=await oldJiti.import(temp+'/content.ts');
const openings=[{id:'program-a',continent:'Europe',country:'Italy',region:'South',intake:'Autumn',university:'Existing university',logoText:'EU',programName:'Existing program',deadline:'2027-06-01',tuitionRange:'Existing range'}],stories=[{id:'public-story-a',profile_image_url:content.DEFAULT_HERO_SLIDES[0].src,full_name:'Approved public fixture',testimonial:'Approved text',country:'Italy',program:'Existing program',university:'Existing university',sort_order:0}];
function normalize(Component,props){const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component,props)));for(const element of dom.window.document.querySelectorAll('*'))for(const attribute of [...element.attributes])if(attribute.name.startsWith('data-home-'))element.removeAttribute(attribute.name);const result={text:dom.window.document.body.textContent.replace(/\s+/g,' ').trim(),headings:[...dom.window.document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent),links:[...dom.window.document.querySelectorAll('a')].map(e=>[e.textContent.trim(),e.getAttribute('href')]),images:[...dom.window.document.querySelectorAll('img')].map(e=>[e.getAttribute('src'),e.getAttribute('alt')]),forms:[...dom.window.document.querySelectorAll('input')].map(e=>[e.id,e.getAttribute('placeholder')]),classes:[...dom.window.document.querySelectorAll('section,article,h1,h2,h3')].map(e=>e.className)};dom.window.close();return result;}
const old=normalize(Old,{initialOpenings:openings,heroCopy:content.HERO_DEFAULTS,successStories:stories});
const current=normalize(Current,{initialOpenings:openings,heroCopy:content.HERO_DEFAULTS,successStories:stories,site:{},blocks:[],countries:countryDetails,universities:[]});
for(const key of Object.keys(old).filter(key=>key!=='classes'))assert.deepEqual(current[key],old[key],key+' must retain existing default public output');
console.log('PASS: all nine default public sections match accepted production baseline text, headings, links, images and form hints; approved Phase 07 styling changes are excluded. No records or storage accessed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
