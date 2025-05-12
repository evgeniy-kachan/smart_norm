
import rules from './building_norms_sp54_combined.json' assert { type: 'json' };

const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const output = document.getElementById('output');

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  output.textContent = 'Распознавание...';

  const reader = new FileReader();
  const imageData = await new Promise(resolve => {
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise(resolve => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.src = imageData;
  });

  const worker = await Tesseract.createWorker({ logger: m => console.log(m) });
  await worker.loadLanguage('eng+rus');
  await worker.initialize('eng+rus');
  const { data } = await worker.recognize(imageData);
  await worker.terminate();

  output.textContent = data.text;

  ctx.font = "16px Arial";
  ctx.strokeStyle = "red";
  ctx.fillStyle = "red";
  ctx.lineWidth = 2;

  data.words.forEach((word, idx) => {
    const text = word.text.toLowerCase();
    const next = data.words[idx + 1]?.text.toLowerCase();

    // проверка ширины коридора
    if (text.includes("коридор") && next && /[0-9.]+/.test(next)) {
      const value = parseFloat(next.replace(',', '.'));
      if (value < (rules["коридор"]?.ширина?.min_mm || 1200) / 1000) {
        const { x0, y0, x1, y1 } = word.bbox;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillText("❌ " + rules["коридор"].ширина.message, x0, y0 - 5);
      }
    }

    // проверка ширины входной двери
    if (text.includes("дверь") && next && /[0-9]+/.test(next)) {
      const value = parseInt(next.replace(/\D/g, ''), 10);
      if (value < (rules["входная дверь"]?.ширина?.min_mm || 1000)) {
        const { x0, y0, x1, y1 } = word.bbox;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillText("❌ " + rules["входная дверь"].ширина.message, x0, y0 - 5);
      }
    }
  });
});
