import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
export function mediaFixture() {
  const user = { id: randomUUID(), email: 'media-test@example.invalid' };
  const tables = Object.fromEntries(['cms_media_assets','cms_content_blocks','site_content','featured_universities','programs','success_stories','blogs','team_members','about_partners','countries','region_groups','program_openings'].map(name => [name, []]));
  const state = { tables, objects: new Map(), requests: [], fine: { '*': true }, areas: { content: true, academic: true, applications: true, submissions: true }, super: false, missing: false, uploadError: false, activationError: false, inventoryError: false, profile: true, clock: 0, tableFailure: '', session: user, revalidated: [] };
  const jsonbOrder = value => Array.isArray(value) ? value.map(jsonbOrder) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,jsonbOrder(value[key])])) : value;
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const matches = (row, params) => [...params].every(([key, filter]) => {
    if (filter.startsWith('eq.')) return String(row[key]) === filter.slice(3);
    if (filter === 'is.null') return row[key] == null;
    return true;
  });
  const transport = async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET';
    assert.equal(url.hostname, 'media-tests.invalid', 'All traffic stays in the isolated transport');
    const pathname = decodeURIComponent(url.pathname);
    state.requests.push({ pathname, method, query: url.searchParams, upsert: options.headers?.['x-upsert'] });
    if (pathname.startsWith('/storage/')) {
      assert(!pathname.includes('documents'), 'Never access student application storage');
      if (pathname.startsWith('/storage/v1/bucket/')) { assert.equal(method, 'GET'); return response({ id:'featured-university-media', name:'featured-university-media', public:true, allowed_mime_types:['image/jpeg','image/png','image/webp','image/gif'],file_size_limit:5242880 }); }
      if (pathname.includes('/object/list/')) { assert.equal(method,'POST'); const body=JSON.parse(options.body); assert.equal(body.prefix,'cms'); return response([]); }
      if (pathname.startsWith('/storage/v1/object/featured-university-media/')) {
        assert.equal(method,'POST'); const key=pathname.split('/featured-university-media/')[1]; assert(/^cms-library\/[0-9a-f-]{36}\.webp$/.test(key));
        assert.equal(String(new Headers(options.headers).get('x-upsert')),'false');
        if(state.uploadError)return response({error:'Synthetic upload failure',message:'Synthetic upload failure',statusCode:'500'},500);
        assert(!state.objects.has(key)); state.objects.set(key, Buffer.from(options.body instanceof Blob ? await options.body.arrayBuffer() : options.body));
        return response({Key:`featured-university-media/${key}`});
      }
      if(pathname === '/storage/v1/object/featured-university-media') { assert.equal(method,'DELETE');const {prefixes}=JSON.parse(options.body); for(const key of prefixes){assert(/^cms-library\/[0-9a-f-]{36}\.webp$/.test(key)); state.objects.delete(key);} return response([]); }
      throw new Error(`Unexpected storage request ${method} ${pathname}`);
    }
    const table = pathname.split('/').at(-1);
    if(table === 'admin_profiles') {assert.equal(method,'GET');return response(state.profile?[{user_id:user.id,is_super_admin:state.super,permissions:state.areas,permissions_v2:state.fine}]:[]);}
    assert(table in tables, `Forbidden table ${table}`);
    if(state.tableFailure===table)return response({code:'08006',message:'Synthetic table outage'},503);
    if(state.missing && table==='cms_media_assets')return response({code:'PGRST205',message:'Catalogue not installed'},404);
    if(state.inventoryError && table==='blogs')return response({code:'08006',message:'Synthetic usage failure'},503);
    if(method==='HEAD')return new Response(null,{status:200,headers:{'content-range':'0-0/'+tables[table].length}});
    if(method==='GET') {let data=tables[table].filter(row=>matches(row,url.searchParams));const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||data.length);if(url.searchParams.has('order')){const [key,direction]=url.searchParams.get('order').split('.');data=[...data].sort((a,b)=>((a[key]>b[key])-(a[key]<b[key]))*(direction==='desc'?-1:1));}data=data.slice(offset,offset+limit);if(table==='cms_content_blocks')data=data.map(row=>({...row,content:jsonbOrder(row.content)}));const accept=new Headers(options.headers).get('accept')||'';return response(accept.includes('vnd.pgrst.object')?(data[0]??null):structuredClone(data));}
    assert(['POST','PATCH'].includes(method),'No data deletion or account mutations');
    const body=JSON.parse(options.body);
    let data;
    if(method==='POST') {
      const rows=Array.isArray(body)?body:[body];
      if(table==='cms_media_assets'&&rows.some(row=>tables[table].some(old=>old.url===row.url)))return response({code:'23505',message:'Duplicate URL'},409);
      if(table==='cms_content_blocks'&&rows.some(row=>tables[table].some(old=>old.page_slug===row.page_slug&&old.section_key===row.section_key&&old.block_key===row.block_key&&old.sort_order===row.sort_order)))return response({code:'23505',message:'Duplicate singleton or slide position'},409);
      data=rows.map(row=>({id:randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),archived_at:null,...row}));tables[table].push(...data);
    } else {
      if(table==='cms_media_assets'&&body.status==='ready'&&state.activationError)return response({code:'08006',message:'Synthetic acknowledgement failure'},503);
      data=tables[table].filter(row=>matches(row,url.searchParams)); if(table==='cms_content_blocks'&&data.some(row=>tables[table].some(other=>other.id!==row.id&&other.page_slug===row.page_slug&&other.section_key===row.section_key&&other.block_key===row.block_key&&other.sort_order===(body.sort_order??row.sort_order))))return response({code:'23505',message:'Duplicate slide position'},409);
      for(const row of data)Object.assign(row,body,...(['cms_content_blocks','success_stories'].includes(table)?[{updated_at:new Date(Date.UTC(2026,9,28,0,0,++state.clock)).toISOString()}]:[]));
    }
    const accept=new Headers(options.headers).get('accept')||'';
    return response(accept.includes('vnd.pgrst.object')?(data[0]??null):structuredClone(data));
  };
  state.client=createClient('https://media-tests.invalid','synthetic-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}});
  globalThis.__mediaTest=state;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://media-tests.invalid';process.env.ADMIN_EMAILS='';process.env.SUPER_ADMIN_EMAIL='';
  return {state,user};
}
