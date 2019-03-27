(G=>{
'use strict';
const {el, prop, err, initVal, is} = G;
const {Info, Item, Msg, Looper, LooperItem, Type, Game, SubRenderer, Renderer} = G;
const SectionRenderer = (_=>{
	const DomLooper = class extends Looper{
		_isActive = true;
		start(){
			const {_item} = this;
			const f = t=>{
				_item.loop(t);
				if(this._isActive) requestAnimationFrame(f);
			}
			requestAnimationFrame(f);
		}
		activate(){
			this._isActive = true;
			this._item.activate();
		}
		deactivate(){
			this._isActive = false;
			this._item.deactivate();
		}
	};
	const SectionLoopItem = class extends LooperItem{
		constructor(_sectionRenderer){
			super();
			prop(this, {_sectionRenderer});
		}
		loop(time){ this._sectionRenderer.render(time); }
	};
	return class extends Renderer{
		_stage = initVal(el('tagSelector'));
		_looper = initVal(Looper);
		_bw = 0;
		_bh = 0
		_row = 0;
		_col = 0;
	
		_isdown = false;
		_q = [];
		_currTime = 0;

		constructor({stage:_stage, bg:_bg, bw:_bw, bh:_bh}){		
			super();
			_stage = el(_stage);
			prop(this, {_looper:(new DomLooper).setItem(new SectionLoopItem(this)), _stage, _bw, _bh, _bg});
			_stage.setAttribute('unselectable', 'on');
			_stage.setAttribute('onselectstart', 'return false');
			_stage.addEventListener('mousedown', e=>this.eDown(e));
			_stage.addEventListener('mousemove', e=>this.eMove(e));
			_stage.addEventListener('mouseup', e=>this.eUp(e));
			_stage.addEventListener('mouseleave', e=>this.eUp(e));
			_stage.style.cssText = `
				background-image:url('${_bg}');
				background-size = '${_bw}px ${_bh}px';
			`;
		}
		setGame(_game, _row, _col){
			prop(this, {_game, _row, _col});
			return new Promise((resolve, reject)=>{
				const {_stage, _bw, _bh} = this;
				_stage.style.width = `${_bw * _row}px`;
				_stage.style.height = `${_bh * _col}px`;
				this._looper.start(this._renderLoop, this);
				resolve();
			});
		}
		init(){ return new Promise((resolve, reject)=>resolve()); }
		delayTask(task, time){
			const {_q} = this;
			_q.push({task, time:this._currTime + time});
		}	
		_getItem(x, y){
			const {_srenders} = this;
			const el = document.elementFromPoint(x, y);
			try{
				_srenders.forEach(sr=>{if(sr.find(el)) throw sr;});
			}catch(sr){ return sr; }
		}
		eDown({pageX:x, pageY:y}){
			const {_isdown, _isActivated, _srender2msg} = this;
			if(_isdown || !_isActivated) return;
			const sRenderer = this._getItem(x, y);
			if(sRenderer){
				sRenderer.eDown(_srender2msg.get(sRenderer));
				this._isdown = true;
			}
		}
		eMove({pageX:x, pageY:y}){
			const {_isdown, _isActivated, _srender2msg} = this;
			if(!_isdown || !_isActivated) return;
			const sRenderer = this._getItem(x, y);
			if(sRenderer) sRenderer.eMove(_srender2msg.get(sRenderer));
		}
		eUp({pageX:x, pageY:y}){
			const {_isdown, _isActivated, _srender2msg} = this;
			if(!_isdown ||!_isActivated) return;
			const sRenderer = this._getItem(x, y);
			if(sRenderer) sRenderer.eUp(_srender2msg.get(sRenderer));
			this._isdown = false;
		}
		_add(sRenderer, info){
			const {_stage} = this;
			_stage.appendChild(sRenderer.object);
		}
		_remove(sRenderer){
			return sRenderer.remove();
		}
		_render(time){
			const {_q} = this;
			this._currTime = time;
			for(let i = _q.length; i--;){
				const {time:taskTime, task} = _q[i];
				if(taskTime <= time){
					const q = _q.splice(i, 1);
					task();
				}
			}
		}
	};
})();
prop(G, {SectionRenderer});
})(G);