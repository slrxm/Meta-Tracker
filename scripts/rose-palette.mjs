import {readFileSync,writeFileSync} from 'node:fs';
for (const file of ['src/theme.css','theme.css','app.css']) {
  let css=readFileSync(file,'utf8');
  css=css.replace(/#([0-9a-f]{6})([0-9a-f]{2})?\b/gi,(full,hex,alpha='')=>{
    const [r,g,b]=hex.match(/../g).map(v=>parseInt(v,16));
    if (!(b>r && r>g)) return full;
    const level=(r+g+b)/3;
    const rgb=level<65?[Math.min(62,Math.round(level*1.15)),Math.round(level*.83),Math.round(level)]
      : level<150?[177,119,141]:[243,202,218];
    return '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('')+alpha;
  });
  writeFileSync(file,css);
}
