(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _endpoint='/api/exec';
  var _pending={};

  function getToken(){return localStorage.getItem('cmms_token');}
  function setToken(t){if(t)localStorage.setItem('cmms_token',t);else localStorage.removeItem('cmms_token');}

  function request(action,data,opts){
    opts=opts||{};
    var token=getToken();
    if(!opts.mutation){
      var key=action+JSON.stringify(data||{});
      if(_pending[key])return _pending[key];
    }
    var body=JSON.stringify({action:action,data:data||{},token:token});
    var p=fetch(_endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:body
    }).then(function(r){
      return r.json().then(function(json){
        if(!r.ok||json.success===false){
          if(json.code===401||r.status===401){
            C.session.logout(true);
            return Promise.reject(json);
          }
          return Promise.reject(json);
        }
        return json.data||json;
      });
    }).catch(function(err){
      if(err&&err.code===401)return Promise.reject(err);
      if(err&&err.error){u.showToast(err.error,'error');return Promise.reject(err);}
      u.showToast('Network error. Please try again.','error');
      return Promise.reject(err);
    }).finally(function(){
      if(!opts.mutation){var k=action+JSON.stringify(data||{});delete _pending[k];}
    });
    if(!opts.mutation){var k2=action+JSON.stringify(data||{});_pending[k2]=p;}
    return p;
  }

  C.api={
    get:getToken,set:setToken,
    call:function(action,data){return request(action,data);},
    mutate:function(action,data){return request(action,data,{mutation:true});}
  };
})();
