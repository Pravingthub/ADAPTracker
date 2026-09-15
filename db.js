/* Storage adapter.
   Supabase when config.js is filled in and you are signed in.
   Browser storage otherwise, so the app still works with no account and no network. */
(function(){
"use strict";

var KEY='adap-recovery-v5';
var cfg=(window.ADAP_CONFIG||{});
var sb=null, ws=null, user=null;

var reason='';
function hasCloud(){
  if(!window.supabase){ reason='Supabase library did not load — check the network or an ad blocker'; return false; }
  if(!window.ADAP_CONFIG){ reason='config.js did not load — is it uploaded?'; return false; }
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){ reason='config.js has no URL or key in it'; return false; }
  reason=''; return true;
}

/* ── local fallback ───────────────────────────────────────────────── */
var mem=null;
function localRead(){
  var v=null; try{ v=localStorage.getItem(KEY); }catch(e){ v=mem; }
  if(!v) return null;
  try{ return JSON.parse(v); }catch(e){ return null; }
}
function localWrite(state){
  var j=JSON.stringify(state);
  try{ localStorage.setItem(KEY,j); }catch(e){ mem=j; }
}

/* ── shape helpers ────────────────────────────────────────────────── */
function rowToMs(r){
  return { id:r.id, ord:r.ord, phase:r.phase, text:r.title, dri:r.dri||'', due:r.due||'',
           status:r.status||'todo', findings:r.findings||'', progress:r.progress||'',
           done:r.status==='done', updated_at:r.updated_at };
}
function rowToWeek(r){
  return { id:r.id, week:r.week_ending, m:r.motions||{}, h:r.habits||{}, note:r.note||'' };
}

/* ── public API ───────────────────────────────────────────────────── */
var DB={
  mode:'local',
  reason:function(){ return reason; },
  user:function(){ return user; },

  init:function(){
    if(!hasCloud()){ DB.mode='local'; return Promise.resolve('local'); }
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
    return sb.auth.getSession().then(function(r){
      user=(r.data.session&&r.data.session.user)||null;
      DB.mode = user ? 'cloud' : 'signed-out';
      return DB.mode;
    }).catch(function(e){ reason=String(e.message||e); DB.mode='local'; return 'local'; });
  },

  signIn:function(email){
    if(!sb) return Promise.reject(new Error('Supabase not configured'));
    return sb.auth.signInWithOtp({ email:email, options:{ emailRedirectTo:location.href.split('#')[0] } });
  },
  signOut:function(){
    if(!sb) return Promise.resolve();
    return sb.auth.signOut().then(function(){ user=null; DB.mode='signed-out'; });
  },
  onAuth:function(cb){
    if(!sb) return;
    var first=true;
    sb.auth.onAuthStateChange(function(evt,sess){
      user=(sess&&sess.user)||null;
      /* Supabase fires INITIAL_SESSION on load. Acting on it causes a reload loop. */
      if(first){ first=false; if(evt==='INITIAL_SESSION') return; }
      if(evt==='SIGNED_IN' || evt==='SIGNED_OUT') cb(evt,user);
    });
  },

  load:function(){
    if(DB.mode!=='cloud'){ return Promise.resolve(localRead()); }
    return sb.from('workspaces').select('id,name,target,weeks').limit(1).single()
      .then(function(r){
        if(r.error||!r.data) throw r.error||new Error('No workspace — run seed.sql');
        ws=r.data.id;
        return Promise.all([
          sb.from('milestones').select('*').eq('workspace_id',ws).order('ord'),
          sb.from('weeks').select('*').eq('workspace_id',ws).order('week_ending',{ascending:false})
        ]);
      })
      .then(function(res){
        var ms=(res[0].data||[]).map(rowToMs);
        var wk=(res[1].data||[]).map(rowToWeek);
        var start = wk.length ? wk[wk.length-1].week : '';
        return { start:start, ms:ms, entries:wk };
      });
  },

  saveMilestone:function(m){
    if(DB.mode!=='cloud'){ return Promise.resolve(); }
    var row={ workspace_id:ws, ord:m.ord, phase:m.phase, title:m.text, dri:m.dri||'',
              due:m.due||null, status:m.status, findings:m.findings||'', progress:m.progress||'' };
    if(m.id) row.id=m.id;
    return sb.from('milestones').upsert(row).select('id').single()
      .then(function(r){ if(r.data) m.id=r.data.id; });
  },

  saveWeek:function(e){
    if(DB.mode!=='cloud'){ return Promise.resolve(); }
    return sb.from('weeks').upsert({
      workspace_id:ws, week_ending:e.week, motions:e.m||{}, habits:e.h||{}, note:e.note||''
    },{ onConflict:'workspace_id,week_ending' }).select('id').single()
      .then(function(r){ if(r.data) e.id=r.data.id; });
  },

  deleteWeek:function(e){
    if(DB.mode!=='cloud' || !e.week) return Promise.resolve();
    return sb.from('weeks').delete().eq('workspace_id',ws).eq('week_ending',e.week);
  },

  /* whole-state write — used by local mode and by Import */
  saveAll:function(state){
    if(DB.mode!=='cloud'){ localWrite(state); return Promise.resolve(); }
    var jobs=state.ms.map(function(m,i){ m.ord=i+1; return DB.saveMilestone(m); })
      .concat(state.entries.map(function(e){ return DB.saveWeek(e); }));
    return Promise.all(jobs);
  },

  /* live updates from other people in the workspace */
  subscribe:function(cb){
    if(DB.mode!=='cloud') return;
    sb.channel('adap')
      .on('postgres_changes',{event:'*',schema:'public',table:'milestones'},cb)
      .on('postgres_changes',{event:'*',schema:'public',table:'weeks'},cb)
      .subscribe();
  }
};

window.ADAP_DB=DB;
})();
