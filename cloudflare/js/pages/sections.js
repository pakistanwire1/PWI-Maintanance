(function(){
  var C=window.CMMS=window.CMMS||{};
  var u=C.utils;
  var _data=[];
  var _state={page:1,perPage:25,search:'',editId:null};

  var _days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function init(){
    var mc=C.loader.getContainer();
    mc.innerHTML=[
      '<div class="page-header">',
        '<h2>Section Master</h2>',
        '<div class="header-actions">',
          '<div class="search-box">',
            '<span class="search-icon">'+u.icons.search+'</span>',
            '<input type="text" id="secSearch" placeholder="Search sections..." />',
          '</div>',
          '<button class="btn btn-primary" id="btnAddSection">'+u.icons.plus+' Add Section</button>',
        '</div>',
      '</div>',
      '<div id="secTable" class="table-container"></div>',
      '<div id="secModal" class="modal-overlay" style="display:none;">',
        '<div class="modal">',
          '<div class="modal-header">',
            '<h3 id="secModalTitle">Add Section</h3>',
            '<button class="modal-close" id="btnCloseSecModal">&times;</button>',
          '</div>',
          '<div class="modal-body">',
            '<form id="secForm" autocomplete="off">',
              '<input type="hidden" id="sSectionId" />',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Section Name <span class="req">*</span></label>',
                  '<input type="text" id="sSection" required />',
                '</div>',
                '<div class="form-group">',
                  '<label>Section Code <span class="req">*</span></label>',
                  '<input type="text" id="sSectionCode" required />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group full-width">',
                  '<label>Description</label>',
                  '<textarea id="sDescription" rows="3"></textarea>',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Sunday Off</label>',
                  '<select id="sSundayOff">',
                  '</select>',
                '</div>',
                '<div class="form-group">',
                  '<label>Hours Per Day</label>',
                  '<input type="number" id="sHoursPerDay" value="8" min="1" max="24" />',
                '</div>',
              '</div>',
              '<div class="form-row">',
                '<div class="form-group">',
                  '<label>Status <span class="req">*</span></label>',
                  '<select id="sStatus" required>',
                    '<option value="Active">Active</option>',
                    '<option value="Inactive">Inactive</option>',
                  '</select>',
                '</div>',
                '<div class="form-group"></div>',
              '</div>',
            '</form>',
          '</div>',
          '<div class="modal-footer">',
            '<button class="btn btn-secondary" id="btnCancelSection">Cancel</button>',
            '<button class="btn btn-primary" id="btnSaveSection">Save</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    populateDays();
    bindEvents();
  }

  function populateDays(){
    var sel=u.$('#sSundayOff');
    var html='';
    for(var i=0;i<_days.length;i++){
      html+='<option value="'+_days[i]+'"'+(_days[i]==='Sunday'?' selected':'')+'>'+_days[i]+'</option>';
    }
    sel.innerHTML=html;
  }

  function bindEvents(){
    u.$('#btnAddSection').addEventListener('click',function(){
      _state.editId=null;
      u.resetForm(u.$('#secForm'));
      u.$('#sHoursPerDay').value='8';
      u.$('#sSundayOff').value='Sunday';
      u.$('#secModalTitle').textContent='Add Section';
      u.$('#secModal').style.display='flex';
    });
    u.$('#btnCloseSecModal').addEventListener('click',function(){
      u.$('#secModal').style.display='none';
    });
    u.$('#btnCancelSection').addEventListener('click',function(){
      u.$('#secModal').style.display='none';
    });
    u.$('#btnSaveSection').addEventListener('click',function(){
      saveSection();
    });
    var searchInput=u.$('#secSearch');
    searchInput.addEventListener('input',u.debounce(function(){
      _state.search=searchInput.value.trim();
      load();
    },400));
    u.$('#secTable').addEventListener('click',function(e){
      var btn=e.target.closest('[data-action]');
      if(!btn)return;
      var id=parseInt(btn.closest('tr').dataset.id);
      if(btn.dataset.action==='edit')editSection(id);
      else if(btn.dataset.action==='delete')deleteSection(id);
    });
  }

  function load(){
    u.showLoading(true);
    var params={};
    if(_state.search)params.Search=_state.search;
    C.api.call('getSectionList',params).then(function(data){
      _data=data||[];
      render();
    }).catch(function(){
      _data=[];
      render();
    }).finally(function(){u.showLoading(false);});
  }

  function render(){
    var rows=[];
    for(var i=0;i<_data.length;i++){
      var s=_data[i];
      rows.push(
        '<tr data-id="'+s.SectionID+'">',
          '<td>'+u.escHtml(s.SectionID)+'</td>',
          '<td>'+u.escHtml(s.Section||s.SectionName)+'</td>',
          '<td>'+u.escHtml(s.SectionCode||s.Code||'')+'</td>',
          '<td>'+u.escHtml(s.Description||'-')+'</td>',
          '<td>'+u.escHtml(s.HoursPerDay||8)+'</td>',
          '<td>'+u.statusBadge(s.Status)+'</td>',
          '<td class="actions">',
            '<button class="btn-icon" data-action="edit" title="Edit">'+u.icons.edit+'</button>',
            '<button class="btn-icon btn-danger" data-action="delete" title="Delete">'+u.icons.trash+'</button>',
          '</td>',
        '</tr>'
      );
    }
    u.renderTable(u.$('#secTable'),{
      headers:['ID','Section','Code','Description','Hrs/Day','Status','Actions'],
      rows:rows,
      emptyMsg:'No sections found'
    });
  }

  function getFormData(){
    return{
      Section:u.getVal('#sSection'),
      SectionCode:u.getVal('#sSectionCode'),
      Description:u.getVal('#sDescription'),
      SundayOff:u.getVal('#sSundayOff'),
      HoursPerDay:parseInt(u.getVal('#sHoursPerDay'))||8,
      Status:u.getVal('#sStatus')
    };
  }

  function saveSection(){
    var d=getFormData();
    if(!d.Section||!d.SectionCode||!d.Status){
      u.showToast('Please fill all required fields','error');
      return;
    }
    u.showLoading(true);
    var action=_state.editId?'modifySection':'createSection';
    if(_state.editId)d.SectionID=_state.editId;
    C.api.call(action,d).then(function(){
      u.showToast('Section saved successfully','success');
      u.$('#secModal').style.display='none';
      load();
    }).catch(function(e){
      u.showToast('Error saving section: '+(e.message||e),'error');
      u.showLoading(false);
    });
  }

  function editSection(id){
    var s=null;
    for(var i=0;i<_data.length;i++){
      if(_data[i].SectionID===id){s=_data[i];break;}
    }
    if(!s)return;
    _state.editId=id;
    u.$('#secModalTitle').textContent='Edit Section';
    u.$('#sSectionId').value=s.SectionID;
    u.$('#sSection').value=s.Section||s.SectionName||'';
    u.$('#sSectionCode').value=s.SectionCode||s.Code||'';
    u.$('#sDescription').value=s.Description||'';
    u.$('#sSundayOff').value=s.SundayOff||'Sunday';
    u.$('#sHoursPerDay').value=s.HoursPerDay||8;
    u.$('#sStatus').value=s.Status||'Active';
    u.$('#secModal').style.display='flex';
  }

  function deleteSection(id){
    u.showConfirm('Are you sure you want to delete this section?',function(){
      u.showLoading(true);
      C.api.call('removeSection',{SectionID:id}).then(function(){
        u.showToast('Section deleted','success');
        load();
      }).catch(function(e){
        u.showToast('Error deleting: '+(e.message||e),'error');
        u.showLoading(false);
      });
    });
  }

  function destroy(){
    _data=[];
    _state={page:1,perPage:25,search:'',editId:null};
  }

  C.router.registerPage('sections',{
    title:'Section Master',
    init:init,
    load:load,
    destroy:destroy
  });
})();
