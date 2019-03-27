(G=>{
'use strict';
const {prop, debugMode, err, initVal} = G;
const Info = class{
	constructor(item){
		const {_x:x, _y:y, _typeData:typeData, _isSelected:isSelected, _previousSelected:previousSelected} = item;
		prop(this, {x, y, typeData, isSelected, previousSelected});
		Item.actionExtraKey.forEach((v, k)=>this[k] = item.actionExtra.get(v));
		Object.freeze(this);
	}
};
const Item = class{
	static _actionExtraKey = new Map;
	static get actionExtraKey(){return Item._actionExtraKey;} 
	static set actionExtraKey(key){ Item._actionExtraKey.set(key, Symbol()); }
	_game = initVal(Game);
	_typeData = initVal(TypeData);
	_x = 0;
	_y = 0;
	_isSelected = false;
	_previousSelected = initVal(Item);
	_actionExtra = new Map;

	constructor(_game, _x, _y, _typeData){
		if(!_game || !_typeData) throw `invalid game:${_game}, typedate:${_typeData}`;
		prop(this, { _game, _x, _y, _typeData});
	}
	get actionExtra(){return this._actionExtra;}
	get info(){return new Info(this);}
	get typeData(){return this._typeData;}
	get x(){return this._x;}
	get y(){return this._y;}
	isBorder(item){
		if(!item) return false;
		const {x:ix, y:iy} = item, {x:tx, y:ty} = this;
		return Math.abs(ix - tx) < 2 && Math.abs(iy - ty) < 2; 
	}
	setPos(x, y){this._x = x, this._y = y;}
	remove(){ return this._game.remove(this); }
	get isSelected(){return this._isSelected;}
	get previousSelected(){return this._previousSelected;}
	isSelectedList(item){
		let target = this, i = 100;
		do{
			const {_previousSelected:prev} = target;
			if(prev == item) return true;
			if(!prev) return false;
			target = prev;
		}while(i--);
		return false;
	}
	select(previousItem){
		this._isSelected = true;
		this._previousSelected = previousItem;
	}
	unselect(){
		this._isSelected = false;
		this._previousSelected = null;		
	}
	actionExtra(...gs){
		const {_actionExtra:map} = this, {_actionExtraKey:keys} = Item;
		if(!keys.has(gs[0])) return err(`invalid key:${gs[0]}`);
		const key = keys.get(gs[0]);
		switch(gs.length){
		case 1: return map.get(key);
		case 2: return map.set(key, gs[1]);
		default: err(`invalid arg:${gs}`);
		}
	}
	async action(){throw 'override';}
	async queAction(){throw 'override';}
};
const Msg = class{
	_addInfo = {}
 	_moveInfo = {}
	add(x, y, type){
		const {_addInfo} = this;
		if(x === undefined) return _addInfo;
		prop(this._addInfo, {x, y, type});
		return this;
	}
	get addInfo(){return this._addInfo;}
	move(x, y){
		const {_moveInfo} = this;
		if(x === undefined) return _moveInfo;
		prop(this._moveInfo, {x, y});
		return this;
	}
	get moveInfo(){return this._moveInfo;}
};
const TypeData = class{};
const Type = class{
	_typeData = initVal(TypeData);
	_priority = 0;

	constructor(_typeData){
		prop(this, {_typeData});
	}
	getSubRenderer(renderer){throw 'override';}
	getItem(game, c, r){throw 'override';}
	getExtra(key){return this._extra.get(key);}
	get priority(){return this._priority;}
	set priority(p){this._priority = p;}
	setPriority(rc, cc){this.priority = this._setPriority(rc, cc);}
	_setPriority(rc, cc){throw 'override';}
	reset(){}
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
	_isQueAction = false;
	_removeCnt = 0;
	_createdCnt = 0;

	_previousItem = initVal(Item);

	constructor({column:_column, row:_row, types:_types, renderer:_renderer}){
		prop(this, {_column, _row, _types, _renderer});
		this._init();
	}
	_getGameArray(){
		const {_items, _row} = this;
		const arr = [];
		for(let i = _row; i--;) arr.push([]);
		_items.forEach(item=>(arr[item.y][item.x] = item));
		return arr;
	}
	async _init(){
		const {_renderer, _items, _row, _column, _item2msg} = this;
		_renderer.deactivate();
		await _renderer.setGame(this, _row, _column);
		const coll = [];
		for(let c = 0; c < _column; c++){
			for(let r = 0; r < _row; r++) coll.push(this._add(c, r - _row));
		}
		await Promise.all(coll);
		coll.length = 0;
		_items.forEach(item=>{
			const {_x, _y} = item;
			const msg = _item2msg.get(item);
			msg.move(_x, _y + _row);
			coll.push(_renderer.move(msg).then(_=>item.setPos(_x, _y + _row)));
		});
		await Promise.all(coll);
		await _renderer.init();
		_renderer.activate();
	}
	_add(c, r){
		const {_types, _removeCnt, _createdCnt} = this;
		const types = _types.map(type=>{
			type.setPriority(_removeCnt, _createdCnt);
			return type;
		}).sort(({_priority:a}, {_priority:b})=>b - a);
		let i = 0, max = -1;
		types.some(({priority}, idx)=>{
			if(priority < max){
				i = idx;
				return true;
			}
			max = priority;
		});
		types.splice(i);
		const msg = new Msg;
		const type = types[parseInt(Math.random() * types.length)];
		const item = type.getItem(this, c, r);
		const {_items, _msg2item, _item2msg, _renderer} = this;
		_items.add(item);
		_msg2item.set(msg, item);
		_item2msg.set(item, msg);
		this._createdCnt++;
		msg.add(c, r, type);
		return _renderer.add(msg);
	}
	action(msg){this._m2i(msg).action();}
	addActionQue(v){
		const {_actionQue:que} = this;
		que.push(v);
		if(!this._isQueAction) this._nextActionQue();
	}
	async _nextActionQue(){		
		const {_actionQue:que, _renderer} = this;
		_renderer.deactivate();
		if(que.length){
			this._isQueAction = true;
			await que.shift().queAction();
			this._nextActionQue();
		}else{
			this._isQueAction = false;
			await this._dropBlocks();
		};
	}
	getBorder(item){ return [...this._items].filter(i=>i.isBorder(item)); }
	getInfo(msg){return this._m2i(msg).info;}	
	remove(item){
		const {_items, _item2msg, _msg2item, _renderer} = this;
		const msg = _item2msg.get(item);
		if(msg){
			_msg2item.delete(msg);
			_item2msg.delete(item);
			_items.delete(item);
			return _renderer.remove(msg);	
		}
	}
	_m2i(msg){
		const {_msg2item} = this;
		const item = _msg2item.get(msg);
		if(!item) throw 'invalid item';
		return item;
	}
	selectStart(msg){
		if(!msg) return;
		const item = this._m2i(msg);
		this._previousItem = item;
		item.select();
	}
	selectNext(msg){
		if(!msg) return;
		const item = this._m2i(msg);
		if(!item) return;
		const {_previousItem:curr} = this;
		if(item === curr || item.typeData != curr.typeData || !curr.isBorder(item)) return;
		if(!curr.isSelectedList(item)){
			item.select(curr);
			this._previousItem = item;
		}else{
			if(curr._previousSelected === item){
				this._previousItem = curr._previousSelected;
				curr.unselect();
			}
		}
	}
	async selectEnd(){
		const {_types, _items, _item2msg, _renderer} = this;
		const selected = [..._items].filter(item=>item.isSelected);
		this._previousItem = null;
		if(selected.length > 2){
			_renderer.deactivate();
			this._createdCnt = 0;
			_types.forEach(type=>type.reset());
			this._removeCnt = selected.length;
			await Promise.all(selected.map(item=>this.remove(item)));
			await this._dropBlocks();
			_renderer.activate();
		}else{
			this._removeCnt = 0;
			selected.forEach(item=>item.unselect());
		}
	}
	async _dropBlocks(){
		const {_items, _column, _row, _renderer, _item2msg} = this;
		const coll = [];
		let arr = this._getGameArray();
		for(let c = 0; c < _column; c++){
			for(let r = _row - 1; r > -1; r--){
				if(arr[r] && arr[r][c]){
					let cnt = 0;
					for(let j = r + 1; j < _row; j++){
						if(arr[j] && !arr[j][c]) cnt++;
					}
					if(cnt){
						const item = arr[r][c];
						coll.push(_renderer.move(_item2msg.get(item).move(c, r + cnt)).then(_=>item.setPos(c, r + cnt)));
					}
				}
			}
		}
		await Promise.all(coll);
		arr = this._getGameArray();
		coll.length = 0;
		for(let c = 0; c < _column; c++){
			let y = 0;
			for(let r = _row - 1; r > -1; r--){
				if(arr[r] && !arr[r][c]){
					if(!y) y = r + 1;
					coll.push([this._add(c, r - y), r]);
				}
			}
		}
		if(coll.length){
			const msgs = await Promise.all(coll.map(v=>v[0]));
			await Promise.all(msgs.map((msg, idx)=>{
				const item = this._m2i(msg);
				const {x, y} = item;
				const toY = coll[idx][1];
				msg.move(x, toY);
				return _renderer.move(msg).then(_=>item.setPos(x, toY));
			}));
		}
		_renderer.activate();
	}
};
const SubRenderer = class{
	_renderer = initVal(Renderer);
	_x = 0;
	_y = 0;
	constructor(_renderer){prop(this, {_renderer});}
	get object(){throw 'override';}
	find(v){throw 'override';}
	add(info){throw 'override-return promise';}
	remove(){throw 'override-return promise';}
	move(info){throw 'override-return promise';}
	render(info){throw 'override';}
};
const LooperItem = class{
	loop(time){throw 'override'}
}
const Looper = class{
	_item = initVal(LooperItem);
	setItem(_item){ 
		prop(this, {_item});
		return this;
	}
	start(){throw 'override';}
	activate(){throw 'override';}
	deactivate(){throw 'override';}
}
const Renderer = class{
	_isActivated = true;
	_srenders = new Set;
	_msg2srender = new WeakMap;
	_srender2msg = new WeakMap;

	_game = initVal(Game);
	_row = 0;
	_col = 0;

	setGame(_game, _row, _col){	throw 'override-return promise'; }
	init(){throw 'override-return promise'}
	activate(){ this._isActivated = true;}
	deactivate(){ this._isActivated = false; }
	add(msg){
		const {_game, _msg2srender, _srender2msg, _srenders} = this;
		const {x, y, type} = msg.addInfo;
		const sRenderer = type.getSubRenderer(this);
		_srenders.add(sRenderer);
		_msg2srender.set(msg, sRenderer);
		_srender2msg.set(sRenderer, msg);
		const info = _game.getInfo(msg);
		this._add(sRenderer, info);
		return sRenderer.add(info).then(_=>msg);
	}
	remove(msg){
		const {_msg2srender, _srender2msg, _srenders} = this;
		const sRenderer = _msg2srender.get(msg);
		_srenders.delete(sRenderer);
		_srender2msg.delete(sRenderer);
		_msg2srender.delete(msg);
		return this._remove(sRenderer).then(_=>msg);
	}
	_remove(srender){throw 'override-return promise'}
	move(msg){
		const {_msg2srender, _game} = this;
		return _msg2srender.get(msg)
		.move(msg.moveInfo)
		.then(_=>msg);
	}
	action(srender){
		this._game.action(this._srender2msg.get(srender));
	}
	selectStart(srender){
		if(this._isActivated) this._game.selectStart(srender);
	}
	selectNext(srender){
		if(this._isActivated) this._game.selectNext(srender);
	}
	selectEnd(){
		if(this._isActivated) this._game.selectEnd();
	}
	render(...arg){
		const {_game, _srender2msg, _srenders} = this;
		_srenders.forEach(sRender=>sRender.render(_game.getInfo(_srender2msg.get(sRender))));
		this._render(...arg);
	}
	_render(...arg){throw 'override'}
};	

prop(G, {Info, Item, Msg, Type, TypeData, Looper, LooperItem, Game, SubRenderer, Renderer});
})(G);