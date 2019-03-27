const G = {
el:v=>document.querySelector(v),
prop:(...arg)=>Object.assign(...arg),
debugMode:'debug', //debug, log, none 
err:msg=>{
	switch(debugMode){
	case'log': console.log(msg);
	return false; 
	case'none':return false;
	default:throw msg;
	}
},
initVal:_=>null,
is:(v, cls)=>v instanceof cls
};