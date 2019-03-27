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

const Game = class{
  _column = 0;
  _row = 0;
  _types = initVal([Type]);
  _renderer = initVal(Renderer);

  _items = new Set;
  _msg2item = new WeakMap;
  _item2msg = new WeakMap;

  _actionQue = [];
  _removeCnt = 0;
  _createdcnt = 0;

  _previousItem = initVal(Item);

  constructor({column:_column, row:_row, types:_types, renderer:_renderer}){
    prop(this, {_column, _row, _types, _renderer});
    this._init();
  }

  async _init(){
    const {_renderer, _items, _row, _column, _item2msg} = this;
    _renderer.deactivate();
    await _renderer.setGame(this, _row, _column);
    const coll = [];
    for(let c = 0; c < _column; c++){
      for(let r = 0; r < _row; r++) coll.push(this._add(c, r - _row));
    }
    await Promise.all(coll)
  }


}