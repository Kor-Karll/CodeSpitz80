let debugMode = 'debug';  // debug, log, none
const err =msg=>{
  switch(debugMode){
    case 'log':
      console.log(msg);
      return false;
    case 'none':
  }
  if(debugMode == 'log'){
    console.log(msg);
    return false;
  }else{
    throw msg;
  }
}

const Item = class{
constructor(_game, _type, _x, _y){
  if(!_game) return err(`invalid game:${game}`);
  prop(this,{
    _game, _type, _x, _y,
    _isSelected:false,_previousSelected:null,
    _isActionActivated:false
  });
}

  // 일반가능
  get type(){}
  get x(){return this._x}
  get y(){}
  isBorder(item){
    const white = {item};
    if(!white.item) return err(`invalid item:${item}`);
    const {item:{x:ix, y:iy}} = white, {x:tx, y:ty} = this;
    return this != white.item && Math.abs(ix - tx) < 2 && Math.abs(iy - ty) < 2;
  }

  setPos(x, y){
    this.x = x, this.y = y;
  }

  // 셀렉트 관련
  get isSelected(){}
  get previousSelected(){}
  isSelectedList(item){
    const {_previousSelected : prev} = this; // 쉴드패턴
    if(!prev) return false;
    return prev == item || prev.isSelectedList(item);
  }

  select(previousItem){
    this._isSelected = true;
    this._previousSelected = previousItem;
  }

  unselect(){
    this._isSelected = false;
    this._previousSelected = null;
  }

  // 액션 관련
  get isActionActivated(){}
  action(){return false;}
  queAtion(){}
};