# توضیحات سیستم نور و سایه

## 0. چرا قسمتی از محیط سایه ندارد؟

### مشکل اصلی: Shadow Frustum کوچکتر از صحنه است

**Shadow Frustum** محدوده‌ای است که سایه‌ها در آن رندر می‌شوند. اگر آبجکتی خارج از این محدوده باشد، سایه‌اش رندر نمی‌شود و در نتیجه آن قسمت از محیط سایه ندارد.

### علل احتمالی:

1. **Shadow Frustum کوچکتر از صحنه**:
   - اگر صحنه شما `800m x 800m` باشد اما `shadowFrustumSize = 600` باشد
   - آبجکت‌های دورتر از مرکز (بیش از 300 متر) سایه ندارند

2. **مرکز Shadow Frustum درست تنظیم نشده**:
   - اگر مرکز صحنه در `(0, 0, 0)` باشد اما آبجکت‌ها در `(400, 0, 400)` باشند
   - Shadow Frustum باید مرکز خود را به مرکز واقعی صحنه منتقل کند

3. **autoUpdateExtends غیرفعال است**:
   - این قابلیت باید `true` باشد تا به‌صورت خودکار محدوده را تنظیم کند

4. **autoAdjustShadowFrustum فراخوانی نشده**:
   - بعد از تولید صحنه یا جابجایی آبجکت‌ها، باید این تابع فراخوانی شود

### راه حل‌های اعمال شده:

✅ **autoUpdateExtends = true**: همیشه فعال است  
✅ **autoAdjustShadowFrustum()**: بعد از تولید صحنه فراخوانی می‌شود  
✅ **بهبود محاسبه محدوده**: حالا TransformNodes (درخت‌ها) هم در محاسبه محدوده لحاظ می‌شوند  
✅ **افزایش margin**: از 20% به 30% افزایش یافت  
✅ **forceCompilation**: بعد از تنظیم محدوده، shadow map مجدداً compile می‌شود

---

## 1. انواع نورها (Lights)

### 1.1. Hemispheric Light (نور محیطی)
- **نوع**: نور محیطی که از همه جهات می‌تابد
- **جهت**: `Vector3(0, 1, 0)` - از بالا به پایین
- **شدت (Intensity)**: `0.8` (پیش‌فرض)
- **رنگ**: `Color3(0.9, 0.95, 1.0)` - آبی روشن (آسمان)
- **کاربرد**: روشنایی کلی صحنه، شبیه‌سازی نور آسمان

### 1.2. Directional Light (نور خورشید)
- **نوع**: نور جهت‌دار (مثل خورشید)
- **جهت**: `Vector3(0.5, -0.8, 0.3)` - از جنوب شرق
- **موقعیت**: `Vector3(-30, 50, 20)` - موقعیت منبع نور
- **شدت (Intensity)**: `1.3` (پیش‌فرض)
- **رنگ**: `Color3(1, 0.98, 0.85)` - زرد گرم (نور خورشید)
- **کاربرد**: ایجاد سایه‌ها و روشنایی جهت‌دار

---

## 2. Shadow Generator (تولیدکننده سایه)

### 2.1. تنظیمات اصلی
- **Shadow Map Size**: `4096x4096` - رزولوشن نقشه سایه (هرچه بیشتر، کیفیت بهتر)
- **نوع سایه**: Hard Shadows (پیش‌فرض) برای عملکرد بهتر

### 2.2. پارامترهای کیفیت سایه

#### **shadowDarkness** (تاریکی سایه)
- **مقدار پیش‌فرض**: `0.25`
- **محدوده**: `0.0` (بدون سایه) تا `1.0` (کاملاً تاریک)
- **توضیح**: هرچه بیشتر باشد، سایه‌ها تیره‌تر می‌شوند
- **توصیه**: `0.2` تا `0.3` برای سایه‌های طبیعی

#### **shadowBias** (بایاس سایه)
- **مقدار پیش‌فرض**: `0.001`
- **محدوده**: `0.0` تا `0.01`
- **توضیح**: فاصله از سطح برای جلوگیری از "shadow acne" (نقاط روشن روی سایه)
- **مشکل**: اگر خیلی کم باشد → shadow acne (نقاط روشن)
- **مشکل**: اگر خیلی زیاد باشد → "peter panning" (سایه از سطح جدا می‌شود)
- **توصیه**: `0.0001` تا `0.001`

#### **shadowNormalBias** (بایاس نرمال)
- **مقدار پیش‌فرض**: `0.2`
- **محدوده**: `0.0` تا `1.0`
- **توضیح**: جابجایی در جهت نرمال برای کاهش shadow acne
- **کاربرد**: برای سطوح شیب‌دار و زاویه‌دار
- **توصیه**: `0.1` تا `0.3`

#### **shadowDepthScale** (مقیاس عمق)
- **مقدار پیش‌فرض**: `200`
- **محدوده**: `50` تا `500`
- **توضیح**: مقیاس برای محاسبه عمق در shadow map
- **کاربرد**: تنظیم دقت محاسبات عمق
- **توصیه**: `100` تا `300`

---

## 3. Shadow Frustum (محدوده سایه)

Shadow Frustum محدوده‌ای است که سایه‌ها در آن رندر می‌شوند. اگر آبجکتی خارج از این محدوده باشد، سایه‌اش درست نمایش داده نمی‌شود.

### 3.1. پارامترهای Shadow Frustum

#### **shadowOrthoScale** (مقیاس ارتوگرافیک)
- **مقدار پیش‌فرض**: `500`
- **توضیح**: اندازه محدوده سایه در یک جهت (متر)
- **مثال**: `500` یعنی محدوده `500m x 500m`
- **مشکل**: اگر صحنه بزرگتر از این باشد، سایه‌ها در لبه‌ها ناپدید می‌شوند
- **راه حل**: افزایش این مقدار برای صحنه‌های بزرگتر

#### **shadowFrustumSize** (اندازه فراستوم)
- **مقدار پیش‌فرض**: `600`
- **توضیح**: اندازه کل محدوده سایه (متر)
- **مثال**: `600` یعنی محدوده `600m x 600m`
- **نکته**: باید با `shadowOrthoScale` هماهنگ باشد

#### **shadowMinZ** (حداقل فاصله Z)
- **مقدار پیش‌فرض**: `0.01`
- **توضیح**: نزدیک‌ترین فاصله از نور که سایه رندر می‌شود
- **کاربرد**: جلوگیری از مشکلات نزدیک به نور

#### **shadowMaxZ** (حداکثر فاصله Z)
- **مقدار پیش‌فرض**: `1414.213562373095`
- **توضیح**: دورترین فاصله از نور که سایه رندر می‌شود
- **کاربرد**: برای صحنه‌های بزرگ
- **نکته**: هرچه بیشتر باشد، محدوده بیشتری پوشش داده می‌شود

### 3.2. autoUpdateExtends (به‌روزرسانی خودکار)
- **مقدار پیش‌فرض**: `true`
- **توضیح**: به‌صورت خودکار محدوده سایه را بر اساس محتوای صحنه تنظیم می‌کند
- **مزیت**: سایه‌ها همیشه صحنه را پوشش می‌دهند
- **نکته**: این قابلیت کلیدی برای حل مشکل سایه‌های ناپدید شده است

---

## 4. مشکلات رایج و راه حل‌ها

### 4.1. سایه‌ها در لبه‌های صحنه ناپدید می‌شوند
**علت**: Shadow Frustum کوچکتر از صحنه است

**راه حل**:
```javascript
// افزایش shadowOrthoScale و shadowFrustumSize
directionalLight.shadowOrthoScale = 800;  // افزایش از 500 به 800
directionalLight.shadowFrustumSize = 1000; // افزایش از 600 به 1000
directionalLight.shadowMaxZ = 2000;        // افزایش از 1414 به 2000
```

### 4.2. Shadow Acne (نقاط روشن روی سایه)
**علت**: `shadowBias` خیلی کم است

**راه حل**:
```javascript
shadowGenerator.bias = 0.001;        // افزایش از 0.0001
shadowGenerator.normalBias = 0.2;   // افزایش از 0.1
```

### 4.3. Peter Panning (سایه از سطح جدا می‌شود)
**علت**: `shadowBias` خیلی زیاد است

**راه حل**:
```javascript
shadowGenerator.bias = 0.0005;      // کاهش از 0.001
shadowGenerator.normalBias = 0.15;  // کاهش از 0.2
```

### 4.4. سایه‌های نویزدار یا دندانه‌دار
**علت**: Shadow Map Size کوچک یا تنظیمات فیلتر نادرست

**راه حل**:
```javascript
// افزایش رزولوشن shadow map
shadowGenerator = new BABYLON.ShadowGenerator(4096, directionalLight); // از 2048 به 4096

// فعال کردن PCF (Percentage Closer Filtering)
shadowGenerator.usePercentageCloserFiltering = true;
shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
```

### 4.5. سایه‌ها خیلی تیره یا خیلی روشن هستند
**راه حل**:
```javascript
// برای سایه‌های تیره‌تر
shadowGenerator.setDarkness(0.3);  // افزایش از 0.25

// برای سایه‌های روشن‌تر
shadowGenerator.setDarkness(0.15); // کاهش از 0.25
```

---

## 5. تنظیمات پیشنهادی برای صحنه‌های مختلف

### صحنه کوچک (تا 200 متر)
```javascript
shadowOrthoScale = 300;
shadowFrustumSize = 400;
shadowMaxZ = 500;
shadowMapSize = 2048;
```

### صحنه متوسط (200-500 متر) - **پیش‌فرض فعلی**
```javascript
shadowOrthoScale = 500;
shadowFrustumSize = 600;
shadowMaxZ = 1414;
shadowMapSize = 4096;
```

### صحنه بزرگ (500-1000 متر)
```javascript
shadowOrthoScale = 800;
shadowFrustumSize = 1000;
shadowMaxZ = 2000;
shadowMapSize = 4096;
```

### صحنه خیلی بزرگ (بیش از 1000 متر)
```javascript
shadowOrthoScale = 1200;
shadowFrustumSize = 1500;
shadowMaxZ = 3000;
shadowMapSize = 4096;
// توجه: shadowMapSize بیشتر از 4096 ممکن است عملکرد را کاهش دهد
```

---

## 6. چگونه مشکل سایه‌ها را پیدا کنیم؟

### 6.1. چک‌لیست مشکلات رایج

#### مشکل 1: سایه‌ها در برخی قسمت‌های صحنه نمایش داده نمی‌شوند
**علل احتمالی:**
- Shadow Frustum کوچکتر از صحنه است
- مرکز Shadow Frustum درست تنظیم نشده
- `autoUpdateExtends` غیرفعال است

**راه حل:**
```javascript
// در Console مرورگر اجرا کنید:
window.digitalTwinApp.lightingManager.debugShadowFrustum();
window.digitalTwinApp.lightingManager.autoAdjustShadowFrustum();
```

#### مشکل 2: سایه‌ها خیلی تیره یا خیلی روشن هستند
**علل احتمالی:**
- `shadowDarkness` نامناسب است
- نور محیطی (hemispheric light) خیلی قوی است

**راه حل:**
```javascript
// بررسی تنظیمات سایه
const lm = window.digitalTwinApp.lightingManager;
console.log('Shadow darkness:', lm.getShadowDarkness());
console.log('Hemispheric intensity:', lm.hemisphericLight.intensity);

// تنظیم تاریکی سایه (0 = بدون سایه، 1 = کاملاً تاریک)
lm.setShadowDarkness(0.25); // مقدار پیشنهادی: 0.2 تا 0.3
```

#### مشکل 3: سایه‌ها نویزدار یا دندانه‌دار هستند
**علل احتمالی:**
- Shadow Map Size کوچک است
- `shadowBias` یا `shadowNormalBias` نامناسب است

**راه حل:**
```javascript
const lm = window.digitalTwinApp.lightingManager;
console.log('Shadow map size:', lm.shadowGenerator.getShadowMap().getSize());
console.log('Shadow bias:', lm.getShadowBias());
console.log('Shadow normal bias:', lm.getShadowNormalBias());

// افزایش رزولوشن shadow map (اگر ممکن باشد)
// تنظیم bias
lm.setShadowBias(0.001); // مقدار پیشنهادی: 0.0001 تا 0.001
lm.setShadowNormalBias(0.2); // مقدار پیشنهادی: 0.1 تا 0.3
```

#### مشکل 4: سایه‌ها از سطح جدا می‌شوند (Peter Panning)
**علل احتمالی:**
- `shadowBias` خیلی زیاد است

**راه حل:**
```javascript
// کاهش shadowBias
lm.setShadowBias(0.0005); // کاهش از مقدار فعلی
```

#### مشکل 5: نقاط روشن روی سایه‌ها (Shadow Acne)
**علل احتمالی:**
- `shadowBias` خیلی کم است
- `shadowNormalBias` خیلی کم است

**راه حل:**
```javascript
// افزایش shadowBias و shadowNormalBias
lm.setShadowBias(0.001);
lm.setShadowNormalBias(0.2);
```

### 6.2. توابع دیباگ موجود

#### 6.2.1. debugShadowFrustum()
این تابع اطلاعات کامل درباره Shadow Frustum را در console نمایش می‌دهد:

**استفاده:**
```javascript
// در Console مرورگر (F12) اجرا کنید:
window.digitalTwinApp.lightingManager.debugShadowFrustum();
```

**خروجی شامل:**
- اندازه Shadow Frustum (shadowOrthoScale, shadowFrustumSize)
- محدوده صحنه (Scene bounds)
- مرکز صحنه (Scene center)
- فاصله قطر صحنه (Diagonal distance)
- آیا Shadow Frustum کافی است یا نه

**مثال خروجی:**
```
=== Shadow Frustum Debug Info ===
Shadow Ortho Scale: 1000.00m
Shadow Frustum Size: 1000.00m
Shadow Min Z: 0.01
Shadow Max Z: 1500.00m
Scene Bounds: X[-250.00, 250.00] Z[-250.00, 250.00]
Scene Size: 500.00m x 500.00m
Scene Center: X=0.00, Z=0.00
Diagonal Distance: 707.11m
Shadow Coverage: 1000.00m x 1000.00m
✓ Shadow frustum is sufficient to cover the entire scene
```

#### 6.2.2. autoAdjustShadowFrustum()
این تابع به‌صورت خودکار Shadow Frustum را بر اساس محتوای صحنه تنظیم می‌کند:

**استفاده:**
```javascript
window.digitalTwinApp.lightingManager.autoAdjustShadowFrustum();
// یا
window.autoAdjustShadowFrustum();
```

**چه کاری انجام می‌دهد:**
- محاسبه محدوده واقعی صحنه (bounds)
- تنظیم اندازه Shadow Frustum برای پوشش کامل صحنه
- فعال کردن `autoUpdateExtends`
- Force refresh کردن Shadow Map

#### 6.2.3. toggleLightHelper()
نمایش/مخفی کردن helper نور برای دیدن موقعیت و جهت نور:

**استفاده:**
```javascript
window.toggleLightHelper(); // Toggle visibility
window.showLightHelper();   // Show helper
window.hideLightHelper();   // Hide helper
```

### 6.3. مراحل دیباگ گام به گام

#### مرحله 1: بررسی وضعیت کلی سایه‌ها
```javascript
const lm = window.digitalTwinApp.lightingManager;

// بررسی فعال بودن سایه‌ها
console.log('Shadows enabled:', lm.areShadowsEnabled());
console.log('Object shadows enabled:', lm.areObjectShadowsEnabled());

// بررسی تنظیمات Shadow Generator
if (lm.shadowGenerator) {
    console.log('Shadow darkness:', lm.shadowGenerator.getDarkness());
    console.log('Shadow bias:', lm.shadowGenerator.bias);
    console.log('Shadow normal bias:', lm.shadowGenerator.normalBias);
    console.log('Shadow map size:', lm.shadowGenerator.getShadowMap().getSize());
}
```

#### مرحله 2: بررسی Shadow Frustum
```javascript
// نمایش اطلاعات کامل Shadow Frustum
window.digitalTwinApp.lightingManager.debugShadowFrustum();

// بررسی تنظیمات Directional Light
const dl = window.digitalTwinApp.lightingManager.directionalLight;
if (dl) {
    console.log('Shadow Ortho Scale:', dl.shadowOrthoScale);
    console.log('Shadow Frustum Size:', dl.shadowFrustumSize);
    console.log('Shadow Max Z:', dl.shadowMaxZ);
    console.log('Auto Update Extends:', dl.autoUpdateExtends);
}
```

#### مرحله 3: بررسی محدوده صحنه
```javascript
const scene = window.digitalTwinApp.sceneManager.getScene();
const meshes = scene.meshes.filter(m => 
    m.name && 
    !m.name.includes('_wireframe') && 
    !m.name.includes('_helper') &&
    m.name !== 'earth'
);

console.log('Total meshes:', meshes.length);

// محاسبه محدوده صحنه
let minX = Infinity, maxX = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

meshes.forEach(mesh => {
    const bb = mesh.getBoundingInfo();
    if (bb && bb.boundingBox) {
        const min = bb.boundingBox.minimumWorld;
        const max = bb.boundingBox.maximumWorld;
        minX = Math.min(minX, min.x);
        maxX = Math.max(maxX, max.x);
        minZ = Math.min(minZ, min.z);
        maxZ = Math.max(maxZ, max.z);
    }
});

console.log('Scene bounds:', {
    X: [minX.toFixed(2), maxX.toFixed(2)],
    Z: [minZ.toFixed(2), maxZ.toFixed(2)],
    width: (maxX - minX).toFixed(2),
    depth: (maxZ - minZ).toFixed(2)
});
```

#### مرحله 4: بررسی آبجکت‌های خاص
```javascript
// بررسی یک آبجکت خاص
const mesh = scene.getMeshByName('building_1'); // نام آبجکت را تغییر دهید
if (mesh) {
    console.log('Mesh:', mesh.name);
    console.log('Position:', mesh.position);
    console.log('Receives shadows:', mesh.receiveShadows);
    console.log('Casts shadows:', mesh.castShadows);
    console.log('Is in shadow generator:', 
        lm.shadowGenerator.getShadowMap().renderList.includes(mesh));
}
```

#### مرحله 5: تست تنظیمات
```javascript
// تست تنظیمات مختلف
const lm = window.digitalTwinApp.lightingManager;

// تست 1: افزایش Shadow Frustum
lm.directionalLight.shadowOrthoScale = 1200;
lm.directionalLight.shadowFrustumSize = 1200;
lm.shadowGenerator.forceCompilation = true;

// تست 2: تنظیم مجدد Shadow Frustum
setTimeout(() => {
    lm.autoAdjustShadowFrustum();
}, 1000);
```

### 6.4. اسکریپت دیباگ کامل

یک اسکریپت کامل برای بررسی همه چیز:

```javascript
// کپی کنید و در Console مرورگر اجرا کنید
function debugShadowsComplete() {
    const app = window.digitalTwinApp;
    if (!app || !app.lightingManager) {
        console.error('Application not initialized');
        return;
    }
    
    const lm = app.lightingManager;
    const scene = app.sceneManager.getScene();
    
    console.log('=== COMPLETE SHADOW DEBUG ===\n');
    
    // 1. وضعیت سایه‌ها
    console.log('1. Shadow Status:');
    console.log('   - Shadows enabled:', lm.areShadowsEnabled());
    console.log('   - Object shadows enabled:', lm.areObjectShadowsEnabled());
    console.log('   - Hard shadows enabled:', lm.areHardShadowsEnabled());
    
    // 2. Shadow Generator
    if (lm.shadowGenerator) {
        console.log('\n2. Shadow Generator:');
        console.log('   - Shadow darkness:', lm.shadowGenerator.getDarkness());
        console.log('   - Shadow bias:', lm.shadowGenerator.bias);
        console.log('   - Shadow normal bias:', lm.shadowGenerator.normalBias);
        console.log('   - Shadow depth scale:', lm.shadowGenerator.depthScale);
        const shadowMap = lm.shadowGenerator.getShadowMap();
        console.log('   - Shadow map size:', shadowMap.getSize().width + 'x' + shadowMap.getSize().height);
    }
    
    // 3. Directional Light
    if (lm.directionalLight) {
        console.log('\n3. Directional Light:');
        console.log('   - Position:', lm.directionalLight.position);
        console.log('   - Direction:', lm.directionalLight.direction);
        console.log('   - Intensity:', lm.directionalLight.intensity);
        console.log('   - Shadow Ortho Scale:', lm.directionalLight.shadowOrthoScale);
        console.log('   - Shadow Frustum Size:', lm.directionalLight.shadowFrustumSize);
        console.log('   - Shadow Max Z:', lm.directionalLight.shadowMaxZ);
        console.log('   - Auto Update Extends:', lm.directionalLight.autoUpdateExtends);
    }
    
    // 4. Scene Bounds
    const meshes = scene.meshes.filter(m => 
        m.name && 
        !m.name.includes('_wireframe') && 
        !m.name.includes('_helper') &&
        m.name !== 'earth' &&
        m.isEnabled()
    );
    
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    meshes.forEach(mesh => {
        try {
            const bb = mesh.getBoundingInfo();
            if (bb && bb.boundingBox) {
                const min = bb.boundingBox.minimumWorld;
                const max = bb.boundingBox.maximumWorld;
                minX = Math.min(minX, min.x);
                maxX = Math.max(maxX, max.x);
                minZ = Math.min(minZ, min.z);
                maxZ = Math.max(maxZ, max.z);
            }
        } catch (e) {}
    });
    
    if (minX !== Infinity) {
        const sceneWidth = maxX - minX;
        const sceneDepth = maxZ - minZ;
        const diagonal = Math.sqrt(sceneWidth * sceneWidth + sceneDepth * sceneDepth);
        
        console.log('\n4. Scene Bounds:');
        console.log('   - X range:', minX.toFixed(2), 'to', maxX.toFixed(2));
        console.log('   - Z range:', minZ.toFixed(2), 'to', maxZ.toFixed(2));
        console.log('   - Scene size:', sceneWidth.toFixed(2), 'x', sceneDepth.toFixed(2));
        console.log('   - Diagonal:', diagonal.toFixed(2));
        console.log('   - Total meshes:', meshes.length);
        
        // مقایسه با Shadow Frustum
        if (lm.directionalLight) {
            const frustumSize = lm.directionalLight.shadowFrustumSize;
            console.log('\n5. Shadow Coverage Analysis:');
            console.log('   - Shadow Frustum Size:', frustumSize.toFixed(2));
            console.log('   - Scene Diagonal:', diagonal.toFixed(2));
            if (frustumSize < diagonal * 1.2) {
                console.warn('   ⚠️ WARNING: Shadow frustum might be too small!');
                console.warn('   Recommended size:', (diagonal * 1.4).toFixed(0));
            } else {
                console.log('   ✓ Shadow frustum is sufficient');
            }
        }
    }
    
    console.log('\n=== END DEBUG ===');
}

// اجرای اسکریپت
debugShadowsComplete();
```

### 6.5. مشکلات رایج و راه حل‌های سریع

| مشکل | علت احتمالی | راه حل سریع |
|------|-------------|-------------|
| سایه‌ها در قسمت‌های خاصی نمایش داده نمی‌شوند | Shadow Frustum کوچک | `autoAdjustShadowFrustum()` |
| سایه‌ها خیلی تیره هستند | `shadowDarkness` زیاد | `setShadowDarkness(0.2)` |
| سایه‌ها نویزدار هستند | Shadow Map Size کوچک یا bias نامناسب | افزایش bias یا normalBias |
| سایه‌ها از سطح جدا می‌شوند | `shadowBias` زیاد | کاهش `shadowBias` |
| نقاط روشن روی سایه‌ها | `shadowBias` کم | افزایش `shadowBias` |

---

## 7. توابع دیباگ

### 7.1. debugShadowFrustum()
این تابع اطلاعات کامل درباره Shadow Frustum را در console نمایش می‌دهد:
- اندازه Shadow Frustum
- محدوده پوشش
- مقایسه با اندازه صحنه
- هشدار در صورت کوچک بودن محدوده

**استفاده**:
```javascript
// در console مرورگر
window.digitalTwinApp.lightingManager.debugShadowFrustum();
```

### 6.2. autoAdjustShadowFrustum()
این تابع به‌صورت خودکار Shadow Frustum را بر اساس محتوای صحنه تنظیم می‌کند.

**استفاده**:
```javascript
// در console مرورگر
window.digitalTwinApp.lightingManager.autoAdjustShadowFrustum();
```

---

## 7. نکات مهم

1. **autoUpdateExtends = true**: این قابلیت باید همیشه فعال باشد تا سایه‌ها در همه قسمت‌های صحنه کار کنند.

2. **Shadow Map Size**: هرچه بیشتر باشد، کیفیت بهتر اما عملکرد کمتر. `4096` تعادل خوبی است.

3. **Hard vs Soft Shadows**: Hard shadows سریع‌تر هستند اما Soft shadows طبیعی‌تر به نظر می‌رسند.

4. **Performance**: برای صحنه‌های بزرگ، ممکن است نیاز به کاهش `shadowMapSize` یا استفاده از Hard Shadows باشد.

5. **Testing**: همیشه بعد از تغییر تنظیمات، صحنه را در قسمت‌های مختلف بررسی کنید تا مطمئن شوید سایه‌ها درست کار می‌کنند.

