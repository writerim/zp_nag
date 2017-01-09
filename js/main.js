function monthDiff( str_d1 , str_d2 , is_not_abs ){
  let diff = Math.ceil( ( new Date( str_d1 ).getTime() - new Date( str_d2 ).getTime() ) / 1000 / 60 / 60 / 24 / 30 )
  if( is_not_abs ){
    return diff;
  }
  return Math.abs( diff )
}

var hourMoney = 250;

function dateToDateStr( d ){
  let month = d.getMonth()+1
  let day = d.getDate()
  if( month < 10 ) month = "0" + month
  if( day < 10 ) day = "0" + day
  return d.getFullYear() + '-' + month + '-'  + day
}

// Модель проекта
var ProjectModel = Backbone.Model.extend({
  defaults : {
    title         : null, // название
    startline     : null, // когда надо начать работать
    stopline      : null, // когда надо было завершить
    summ          : null, // сколько выделено на проект
    stop          : null, // когда начали
    argh          : null, // среднее кол-во часов в месяц
    ost           : null, // остаток для выплаты
  },
  validate: function(attrs, options) {

    // blockErr
    // blockVal
    // prop_valid


    var blockErr = options.blockErr
    var blockVal = options.blockVal
    var prop_valid = options.prop_valid

    if( typeof blockVal == 'undefined' ){
      return true;
    }

    // убираем все ошибки

    if( $(blockVal).val().trim() == '' ){
      $(blockErr).text('Поле не может быть пустым')
      $(blockErr).effect('bounce')
      return false;
    }else{
      $(blockErr).text('')
    }

    switch( prop_valid ){
      case 'summ' :
        if( isNaN( $(blockVal).val() ) ){
          $(blockVal).effect('bounce')
          $(blockErr).text('Поле может быть только числом')
          return false;
        }
      break;
      case 'stopline' :
        if( $(blockVal).val() < $('#startline').val() ){
          $(blockVal).effect('bounce')
          $(blockErr).text('Нельза закончить раньше чем начать')
          return false;
        }
      break;
      case 'stop' :
        if( $(blockVal).val() < $('#startline').val() ){
          $(blockVal).effect('bounce')
          $(blockErr).text('Нельза закончить раньше чем начать')
          return false;
        }
      break;
    }

    this.set( prop_valid , $(blockVal).val() )

    return true;
  }
})


// Коллекция проекта
var ProjectCollect = Backbone.Collection.extend({
  model : ProjectModel,
})
var Projects = new ProjectCollect();

// Список зарплат
var ListGonorar = Backbone.View.extend({
  collection : Projects,
  el : '#list_gonorar_render',
  initialize : function(){
    this.render()
  },
  render : function(){

    var cols = []
    var min = "2020-20-20";
    var max = "";
    Projects.each(function(item){
      ['startline' , 'stopline' , 'stop'].map(function( prop ){
        if( !this.get( prop ) ){
          return false;
        }
        if( min == null && this.get( prop ) ){
          min = this.get( prop )
        }
        if( this.get( prop ) < min ){
          min = this.get( prop )
        }
        if( this.get( prop ) > max ){
          max = this.get( prop )
        }
      },item)
    })

    var dmin = new Date( min ).getMonth()

    for( i = dmin ; i<= dmin + monthDiff( min , max ) ; i++ ){
      var d = new Date( min );
      d.setMonth(i)
      cols.push( { month : dateToDateStr( d ) })
    }

    var rows = []
    var projects = []
    var main_summ = []

    Projects.each(function(item){
      var str_project = []
      for( i = dmin ; i<= dmin + monthDiff( min , max ) ; i++ ){
        var d = new Date( min );

        d.setMonth(i)

        var diff = monthDiff( dateToDateStr( d ) , item.get('startline') , true )
        var is_end = monthDiff( dateToDateStr( d ) , item.get('stop') , true ) > 0

        // проект еще не начался
        if( diff < 0 ){
          str_project.push({
            summ : '---'
          })
        }else{

          // проект идет

          let summ = 0

          str_project.push({
            summ : function(){

              if( item.get('stop') <= item.get('stopline') ){
                var d1 = monthDiff( item.get('stopline') , item.get('stop') , true );
                var ost = item.get('ost')
                item.set('ost',0,{silent : true})
                return ost
              }else if( item.get('stop') > item.get('stopline') ){
                item.set('ost' , ( ost - hourMoney * item.get('argh') ) , {silent : true})
                return hourMoney * item.get('argh');
              }else{
                // Если денег на проект выделено меньше чем почасовка то выдавать все
                var ost = item.get('ost')
                if( item.get('ost') <= hourMoney * item.get('argh') ){
                  item.set('ost' , 0 , {silent : true})
                  return ost
                }else{
                  // отдаем деньги по часам и вычитаем из остатка
                  item.set('ost' , ( ost - hourMoney * item.get('argh') ) , {silent : true})
                  return hourMoney * item.get('argh');
                }
              }
            }()
          })
        }
      }
      projects.push({ title : item.get('title') })
      rows.push( str_project )

      // для последующих изменений приравниваем все
      item.set('ost' , item.get('summ') , {silent : true})

    })

    if( typeof rows[0] != 'undefined' ){
      rows[0].map(function( coll , _i ){
        var t = 0;
        for( i = 0 ; i < rows.length ; i++ ){
          if( !isNaN(rows[i][_i].summ) ) t = Number(t) + Number(rows[i][_i].summ)
        }
        main_summ.push( t )
      })
    }

    $(this.$el).html( $('#list_gonorar').tmpl({
      rows : rows,
      cols : cols,
      projects : projects,
      main_summ  : main_summ
    }) )
    return this;
  }
})


// Вид списка проектов
var FormList = Backbone.View.extend({
  el : '#list_project_render',
  render : function(){
    $(this.$el).html( $('#list_projects').tmpl({
      rows : function(){
        return Projects.models.reduce(function( res , item ){
          var ar = {}
          Object.keys(item.attributes).map(function( prop ){
            ar[ prop ] = item.get(prop)
          })
          ar[ 'id' ] = item.cid
          res.push(ar)
          return res;
        },[])
      }()
    }) )
    new ListGonorar()
    return this;
  },
  initialize : function(){
    var self = this
    this.collection.on('change' , function(a){
      self.render()
      new ListGonorar()
    })
    new ListGonorar()
    self.render()
  },
  collection : Projects,
  events : {
    'click .glyphicon-edit' : function(e){
      var id = $(e.target).closest('tr').attr('id').replace('project_',"")
      FormAdd.model = Projects.get(id)
      FormAdd.render()
    },
    'click .glyphicon-remove' : function(e){
      var id = $(e.target).closest('tr').attr('id').replace('project_',"")
      Projects.remove(id)
      this.render()
    }
  }
})


// Вид добавления проекта
var FormAdd = Backbone.View.extend({
  el : '#for_form',

  initialize : function( args ){
    this.render()
  },

  model : new ProjectModel(),

  events : {
    'click #add_project' : function(){

      var valid = true;

      Object.keys(this.model.attributes).map(function( item ){
        if( valid ){
          if( item == 'ost' ){
            this.set('ost' , this.get('summ'))
            return true;
          }
          this.isValid( { prop_valid : item  , blockVal : $('#' + item) , blockErr : $('#' + item + "_error")} )
          valid = this.validationError == true;
        }
      },this.model)

      if( !valid ){
        return this;
      }


      if(!Projects.get(this.model.cid)){
        Projects.add( this.model )
      }

      this.model = new ProjectModel()
      this.render()
      return this;

    }
  },

  render : function(){
    $(this.$el).html( $('#form_add').tmpl( this.model.toJSON() ) )
    return this;
  }
})

// Стартуем
$(document).ready(function(){
  FormAdd = new FormAdd()
  Projects.on("add", function( obj ) {
    new FormList()
    new ListGonorar()
  });
})
