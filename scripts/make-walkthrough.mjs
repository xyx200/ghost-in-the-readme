import sharp from 'sharp';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const shots=[
 {file:'browser-hero.jpg',title:'01 / A SEANCE FOR FORGOTTEN PROMISES',caption:'Paste two versions of a project document. The open-weight model runs on your device.'},
 {file:'browser-results.jpg',title:'02 / FOLLOW THE EVIDENCE',caption:'Actual browser run: 13 passages, 133 ms inference. Every finding retains its source lines.'},
 {file:'browser-negation.jpg',title:'03 / SIMILAR DOES NOT MEAN TRUE',caption:'Opposite offline promises score 0.764. Inspect the source, then keep, retire, or investigate.'},
];
const width=1200,height=760,gif=GIFEncoder();
await mkdir(path.join(root,'demo'),{recursive:true});
for(const [i,shot]of shots.entries()){
 const screenshot=await sharp(await readFile(path.join(root,'evidence',shot.file))).resize(width,650,{fit:'contain',background:'#111a19'}).png().toBuffer();
 const header=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="110"><rect width="${width}" height="110" fill="#111a19"/><text x="32" y="31" font-family="Arial" font-size="15" letter-spacing="2" fill="#d8ed98">${shot.title}</text><text x="32" y="61" font-family="Arial" font-size="14" fill="#f0efdf">${shot.caption}</text><text x="32" y="88" font-family="Arial" font-size="11" fill="#a7b4a8">Edited walkthrough of genuine browser screenshots. Original fictional examples. Not a continuous screen recording.</text></svg>`);
 const frame=await sharp({create:{width,height,channels:4,background:'#111a19'}}).composite([{input:header,top:0,left:0},{input:screenshot,top:110,left:0}]).ensureAlpha().raw().toBuffer();
 const palette=quantize(frame,256);gif.writeFrame(applyPalette(frame,palette),width,height,{palette,delay:6000,repeat:0});
 if(i===1)await sharp(frame,{raw:{width,height,channels:4}}).png().toFile(path.join(root,'demo','walkthrough-poster.png'));
}
gif.finish();await writeFile(path.join(root,'demo','walkthrough.gif'),gif.bytes());
await writeFile(path.join(root,'demo','walkthrough-provenance.json'),JSON.stringify({createdAt:new Date().toISOString(),type:'Edited screenshot slideshow',continuousScreenRecording:false,syntheticInputs:true,sources:shots.map(x=>'evidence/'+x.file),width,height,frames:shots.length,frameDelayMs:6000,sourcePixels:'Genuine screenshots captured through the authorized browser tool; resized with explanatory captions only.'},null,2)+'\n');
console.log(`Wrote demo/walkthrough.gif (${gif.bytes().length} bytes, 3 genuine screenshot frames).`);
