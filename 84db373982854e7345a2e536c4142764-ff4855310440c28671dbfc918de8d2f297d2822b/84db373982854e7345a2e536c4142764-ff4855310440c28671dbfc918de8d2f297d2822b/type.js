(G=>{
'use strict';
const {prop, err, initVal, is} = G;
const {Item, Msg, Type, TypeData, SubRenderer} = G;
const DivRenderer = class extends SubRenderer{
	_bw = 0;
	_bh = 0;
	_img = initVal('Image');
	_div = initVal('DivElement');
	constructor(_renderer, _bw, _bh, _img){
		super(_renderer);
		const _div = document.createElement('div');		
		_div.style.cssText = `
			width:${_bw}px; height:${_bh}px;
			position:absolute;cursor:pointer;overflow:hidden;
			background-image:url('${_img}')
		`;
		prop(this, {_bw, _bh, _img, _div});
	}
	get object(){ return this._div; }
	find(el){return el == this._div;}
	add(info){
		const {x, y} = info;
		const {_div, _bw, _bh, _renderer} = this;
		this.cnt = 0;
		return new Promise((resolve, reject)=>{
			this.render(info);
			resolve();
		});
	}
	remove(){ throw 'override remove - return promise'; }
	move(moveInfo){
		const {x, y} = moveInfo;
		const {_div, _bw, _bh, _renderer} = this;
		return new Promise((resolve, reject)=>{
			const time = (y * _bh - parseInt(_div.style.top)) / _bh * 100;
			_div.style.transition = `top ease-in ${time * 0.001}s`;
			_renderer.delayTask(resolve, time);
		});
	}
	render(info){
		const {x, y, typeData, isSelected} = info;
		const {_div, _bw, _bh, _img} = this;
		_div.style.left = _bw * x +'px';
		_div.style.top = _bh * y +'px';
		_div.style.backgroundPosition = `${-(_bw * typeData.sPos)}px ${isSelected ? -_bh : 0}px`;
	}
	eDown(msg){ throw 'override eDown'; }
	eMove(msg){ throw 'override eMove'; }
	eUp(msg){ throw 'override eUp'; }
};
const NormalType = (_=>{
	const Data = class extends TypeData{
		_sPos = 0;
		_bw = 0;
		_bh = 0;
		_img = '';
		constructor(_sPos, _bw, _bh, _img){
			super();
			prop(this, {_sPos, _bw, _bh, _img});
		}
		get sPos(){return this._sPos;}
		get bw(){return this._bw;}
		get bh(){return this._bh;}
		get img(){return this._img;}
	};
	const CItem = class extends Item{
		constructor(_game, _x, _y, _typeData){
			super(_game, _x, _y, _typeData);
		}
		async action(){return this.remove(); }
		async queAction(){ return Promise.resolve(); }
	};
	const CDivRenderer = class extends DivRenderer{
		constructor(renderer, bw, bh, img){
			super(renderer, bw, bh, img);
		}
		remove(){
			const {_div, _renderer} = this;
			return new Promise((resolve, reject)=>{
				_div.style.transition = "all ease-in 350ms";
				_div.style.transform = `scale(0,0) rotate(${Math.random() * 720 - 360}deg)`;
				_renderer.delayTask(_=>{
					_div.parentNode.removeChild(_div);
					resolve();
				}, 350);
			});
		}
		eDown(msg){ this._renderer.selectStart(msg); }
		eMove(msg){ this._renderer.selectNext(msg); }
		eUp(msg){ this._renderer.selectEnd(msg); }
	};
	const CType = class extends Type{
		static GET(sPos,img, bw, bh){
			return new CType(new Data(sPos, img, bw, bh));
		}
		constructor(_typeData){
			super(_typeData);
		}
		getSubRenderer(renderer){
			const {_bw, _bh, _img} = this._typeData;
			return new CDivRenderer(renderer, _bw, _bh, _img);
		}
		getItem(game, c, r){return new CItem(game, c, r, this._typeData);}
		_setPriority(rc, cc){ return 10; }
		reset(){}
	};
	return CType;
})();
const BombType = (_=>{
	const Data = class extends TypeData{
		_sPos = 0;
		_bw = 0;
		_bh = 0;
		_img = '';
		constructor(_sPos, _bw, _bh, _img){
			super();
			prop(this, {_sPos, _bw, _bh, _img});
		}
		get sPos(){return this._sPos;}
		get bw(){return this._bw;}
		get bh(){return this._bh;}
		get img(){return this._img;}
	};		  
	const CItem = class extends Item{
		constructor(_game, _x, _y, _typeData){
			super(_game, _x, _y, _typeData);
		}
		async action(){
			this._game.addActionQue(this);
			return Promise.resolve();
		}
		async queAction(){
			return Promise.all([
				this.remove(),
				...this._game.getBorder(this).map(item=>item.action())
			]);
		}
	};
	const CDivRenderer = class extends DivRenderer{
		constructor(renderer, bw, bh, img){
			super(renderer, bw, bh, img);
		}
		remove(){
			const {_div, _renderer} = this;
			return new Promise((resolve, reject)=>{
				_div.style.transform = `scale(2.5,2.5) rotate(${Math.random() * 180 - 90}deg)`;
				_div.style.transition = 'all ease-in 350ms';
				_div.style.opacity = 0;				
				_renderer.delayTask(_=>{
					_div.parentNode.removeChild(_div);
					resolve();
				}, 350);
			});
		}
		eDown(msg){}
		eMove(msg){}
		eUp(msg){this._renderer.action(this);}
	}
	const CType = class extends Type{
		static GET(sPos, bw, bh, img){
			return new CType(new Data(sPos, bw, bh, img));
		}
		constructor(_typeData){
			super(_typeData, CItem, CDivRenderer);
			prop(this, {_appearIdx:-1, _isAppeared:false});
		}
		getSubRenderer(renderer){			
			const {_bw, _bh, _img} = this._typeData;
			return new CDivRenderer(renderer, _bw, _bh, _img);
		}
		getItem(game, c, r){return new CItem(game, c, r, this._typeData);}
		_setPriority(rc, cc){ 
			const FREQUENCY = 3;
			const {_isAppeared} = this;
			let {_appearIdx} = this;
			if(FREQUENCY > rc) return 0;
			if(_isAppeared) return 0;
			if(_appearIdx == -1) _appearIdx = this._appearIdx = parseInt(Math.random() * rc);
			if(_appearIdx == 0 || cc == _appearIdx){
				this._isAppeared = true;
				return 100;
			}
			return 0;
		}
		reset(){
			this._appearIdx = -1;
			this._isAppeared = false;
		}
	};
	return CType;
})();
prop(G, {NormalType, BombType});
})(G);