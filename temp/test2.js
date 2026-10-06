
const { createCanvas, loadImage } = require('canvas');
const zxing = require('@zxing/library');

async function runTests() {
  const reader = new zxing.BrowserMultiFormatReader();
  const imgA = await loadImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVIAAACCAQAAAAA8533ZAAAACXBIWXMAABcSAAAXEgFnn9JSAAAAEnRFWHRTb2Z0d2FyZQBCYXJjb2RlNEryjnYuAAABb0lEQVR4Xu3TsU7DMBAGYFseulTKG5BXQGLHr1KpL8DYoZKNGFgqeWXjVYIYGHkEXGXo6k64knU/l6QQVOFSBgaEb0pyn6PL/YoAaLrEjaB5vIjnU5qq3Woi5pNmQVek0sMKYkbqTgONKLbYYosttthiiy222GKLLbbYYn/Tnlr/xAYhrSTphQomVFBAFSS8ztooZkJZ06gkQJ21ddaGvZVJmN6KLy22cAhkWqzM8zolndyW3/2StWugRTIIIB3ZJj32D227t5Ht7gd221kz9o/Zlm00Y//Q+o95k9m4MIk+Z63iEHrL13hyQUWrszbKwba4hnNBxOx+rSIx2EdYc+9efbzMWQd409tb3lbtEBemytuke1uBzrRDWnTPcpZ6SzVwJuRJtovrVNtF0NvlMTvMG/hQzbdxeeTbNrHfwxo7HsNtPGV3ZvkPYmtVwyGw9ZLyWbDFuzVsFfhIzka1tyQBFys0Y/+z/a6KHerP2TdPjE59AT+V7AAAAABJRU5ErkJggg==');
  const canvasA = createCanvas(imgA.width, imgA.height);
  const ctxA = canvasA.getContext('2d');
  ctxA.drawImage(imgA, 0, 0);
  try { 
    const result = reader.decode(canvasA); 
    console.log('Result:', result.getText());
  } catch(e) {
    console.log('Exception:', e.toString());
  }
}
runTests();
