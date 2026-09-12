const {test,expect}=require('@playwright/test');
test('R3D boots, edits, camera-gizmos and renders from active camera',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/r3d/',{waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-r3d-bootstrap','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-boot','1');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-cameras','1');
  await expect(page.locator('#status')).toContainText('Ready');
  await expect(page.locator('#r3dGizmoOverlay')).toHaveCount(1);

  const before=await page.locator('#scene .item').count();
  await page.click('#addCube');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#dupBtn');await expect(page.locator('#scene .item')).toHaveCount(before+2);
  await page.click('#delBtn');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before+2);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before+1);
  await page.click('#undoBtn');await expect(page.locator('#scene .item')).toHaveCount(before);

  await page.click('#moveTool');await expect(page.locator('#moveTool')).toHaveClass(/active/);
  await page.click('#rotateTool');await expect(page.locator('#rotateTool')).toHaveClass(/active/);
  await page.click('#scaleTool');await expect(page.locator('#scaleTool')).toHaveClass(/active/);

  const cams0=await page.locator('#r3dCameraList .item').count();
  await page.click('#addCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(cams0+1);
  await page.click('#copyCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(cams0+2);
  await page.click('#setActiveCamera');
  let active=await page.evaluate(()=>window.R3DRenderer.activeCamera?.());
  expect(active).toBeTruthy();
  await page.fill('#camX','1.25');await page.dispatchEvent('#camX','input');
  active=await page.evaluate(()=>window.R3DCameras.selectedCamera?.());
  expect(Math.abs(active.p[0]-1.25)).toBeLessThan(0.001);
  await page.click('#deleteCamera');await expect(page.locator('#r3dCameraList .item')).toHaveCount(cams0+1);
  await page.click('#setActiveCamera');

  await page.selectOption('#rw','640');await page.selectOption('#rscale','0.5');await page.selectOption('#samples','1');await page.selectOption('#bounces','1');await page.selectOption('#adaptive','0');await page.selectOption('#denoise','0');
  await page.click('#renderBtn');
  await expect(page.locator('#pct')).toHaveText('100%',{timeout:90000});
  await expect(page.locator('#rc')).toHaveAttribute('data-r3d-orientation','upright');
  await expect(page.locator('html')).toHaveAttribute('data-r3d-render-orientation','upright');
  const dims=await page.locator('#rc').evaluate(c=>[c.width,c.height]);expect(dims).toEqual([640,400]);
  const luma=await page.locator('#rc').evaluate(c=>{const x=c.getContext('2d',{willReadFrequently:true}),d=x.getImageData(0,0,c.width,c.height).data;let sum=0,n=0;const step=Math.max(4,Math.floor((c.width*c.height)/4096));for(let i=0;i<d.length;i+=4*step){sum+=(d[i]+d[i+1]+d[i+2])/3;n++}return n?sum/n:0;});
  expect(luma).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});