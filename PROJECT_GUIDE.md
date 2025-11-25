# راهنمای پروژه - Project Guide

## مقدمه

این فایل راهنما برای کمک به AI و توسعه‌دهندگان در درک ساختار، معماری و اصول کدنویسی پروژه است. لطفاً قبل از شروع کار روی پروژه، این راهنما را به دقت مطالعه کنید.

## ساختار پروژه

### پوشه‌بندی اصلی

```
js/
├── modules/          # ماژول‌های اصلی برنامه
├── app.js           # نقطه ورود اصلی (initialization)
└── ...

index.html           # فایل HTML اصلی
```

### ماژول‌های اصلی

پروژه به صورت **ماژولار** طراحی شده است. هر ماژول مسئولیت خاصی دارد:

#### 1. **Scene Management**
- `SceneManager.js` - مدیریت صحنه 3D و موتور Babylon.js
- `SceneOperationsManager.js` - عملیات صحنه (duplicate, delete, empty scene)

#### 2. **Object Management**
- `BuildingGenerator.js` - تولید ساختمان‌ها
- `TreeManager.js` - مدیریت درختان
- `RectangleManager.js` - مدیریت مستطیل‌ها
- `CircleManager.js` - مدیریت دایره‌ها
- `PolygonManager.js` - مدیریت پلیگان‌ها
- `Shape2DManager.js` - مدیریت اشکال 2D

#### 3. **UI Management**
- `UIManager.js` - مدیریت رابط کاربری (اصلی)
- `ObjectListManager.js` - مدیریت لیست اشیاء در UI
- `PropertiesPopupManager.js` - مدیریت پنجره‌های properties
- `ToolManager.js` - مدیریت ابزارها و keyboard shortcuts
- `TransformInputManager.js` - مدیریت فیلدهای ورودی transform

#### 4. **File Operations**
- `STLManager.js` - مدیریت import/export فایل‌های STL

#### 5. **Interaction & Control**
- `SelectionManager.js` - مدیریت انتخاب اشیاء
- `MoveManager.js` - مدیریت جابجایی
- `RotateManager.js` - مدیریت چرخش
- `ScaleManager.js` - مدیریت تغییر اندازه
- `CameraController.js` - کنترل دوربین
- `GridManager.js` - مدیریت grid

#### 6. **Rendering & Lighting**
- `LightingManager.js` - مدیریت نورپردازی و سایه‌ها
- `FPSMonitor.js` - مانیتورینگ عملکرد

## اصول کدنویسی - Coding Principles

### ⚠️ اصل اول: ماژولار بودن (Modularity)

**مهمترین اصل این پروژه: همه چیز باید ماژولار باشد!**

#### قوانین:

1. **هر ماژول یک مسئولیت دارد (Single Responsibility Principle)**
   - هر ماژول باید فقط یک کار را انجام دهد
   - مثال: `STLManager` فقط برای STL، `ToolManager` فقط برای tools

2. **جلوگیری از فایل‌های بزرگ**
   - اگر یک فایل بیش از 2000-3000 خط شد، باید refactor شود
   - فایل‌های بزرگ را به ماژول‌های کوچکتر تقسیم کنید

3. **جلوگیری از انباشته شدن در یک فایل**
   - **هرگز** تمام functionality را در یک فایل (مثل `UIManager.js`) ننویسید
   - اگر می‌خواهید feature جدید اضافه کنید:
     - ابتدا بررسی کنید آیا ماژول مناسب وجود دارد
     - اگر وجود ندارد، ماژول جدید ایجاد کنید
     - اگر وجود دارد، کد را در همان ماژول اضافه کنید

4. **استفاده از Dependency Injection**
   - ماژول‌ها باید dependencies خود را از طریق constructor دریافت کنند
   - از global variables یا singleton patterns غیرضروری پرهیز کنید

### مثال‌های درست و غلط:

#### ❌ غلط - همه چیز در یک فایل:
```javascript
// UIManager.js - 10000+ خط!
class UIManager {
    handleSTLImport() { ... }
    handleSTLExport() { ... }
    handleToolSelection() { ... }
    handleTransformInput() { ... }
    handlePropertiesPopup() { ... }
    // ... 1000+ متد دیگر
}
```

#### ✅ درست - ماژولار:
```javascript
// STLManager.js
class STLManager {
    importSTL() { ... }
    exportSTL() { ... }
}

// ToolManager.js
class ToolManager {
    selectTool() { ... }
}

// TransformInputManager.js
class TransformInputManager {
    updateValues() { ... }
}
```

### اصل دوم: نام‌گذاری اشیاء (Object Naming)

#### فرمت نام‌گذاری:
- **بدون underscore** بین نام و عدد
- فرمت: `typeNumber` (نه `type_number`)

#### مثال‌ها:
- ✅ `building1`, `building2`, `building3`
- ✅ `tree1`, `tree2`, `tree3`
- ✅ `ground1`, `ground2`, `ground3`
- ✅ `grass1`, `grass2`, `grass3`
- ✅ `waterway1`, `waterway2`
- ✅ `highway1`, `highway2`

- ❌ `building_1`, `tree_2`, `ground_3` (غلط)

#### تابع `generateUniqueNameByType(type)`:
- این تابع در `UIManager.js` قرار دارد
- آخرین عدد را پیدا می‌کند و یکی اضافه می‌کند
- از تکراری بودن نام جلوگیری می‌کند

### اصل سوم: مدیریت State

#### `userData` و `metadata`:
- هر mesh می‌تواند `userData` و `metadata` داشته باشد
- `userData` برای ذخیره اطلاعات اصلی (type, shapeType, dimensions, points, etc.)
- `metadata` برای اطلاعات اضافی

#### مثال `userData` برای polygon:
```javascript
mesh.userData = {
    type: 'ground',              // نوع (ground, building, grass, etc.)
    shapeType: 'polygon',        // نوع شکل (polygon, circle, rectangle)
    dimensions: { ... },         // ابعاد
    points: [Vector3, ...],      // نقاط (world coordinates)
    originalHeight: 0.1,         // ارتفاع اولیه
    currentHeight: 0.1,          // ارتفاع فعلی
    sideWallNormalsFlipped: true // flag برای normals
}
```

### اصل چهارم: Duplication

#### هنگام duplicate کردن اشیاء:
1. **حفظ تمام properties**: type, color, material, position, rotation, scaling
2. **نام جدید**: استفاده از `generateUniqueNameByType` برای نام جدید
3. **موقعیت**: duplicate باید در همان موقعیت original باشد (بدون offset)
4. **Deep copy**: `userData` و `metadata` باید deep copy شوند
5. **Material cloning**: material باید clone شود (نه reference)

#### برای polygon‌ها:
- استفاده از `VertexData.ExtractFromMesh` برای حفظ normals
- حفظ `sideWallNormalsFlipped` flag
- حفظ `points` به عنوان `Vector3` objects (نه plain objects)

### اصل پنجم: Normal Management برای Polygon

#### مشکل double-flipping:
- `flipSideWallNormals` همیشه باید چک کند که آیا normals قبلاً flip شده‌اند
- استفاده از `sideWallNormalsFlipped` flag
- `createCustomPolygonExtrusion` همیشه normals را flip می‌کند (یک بار)

#### قانون:
- اگر `mesh.userData.sideWallNormalsFlipped === true` است، **هرگز** دوباره flip نکنید

## معماری و جریان داده (Architecture & Data Flow)

### Initialization Flow:

```
app.js
  ├── SceneManager
  ├── BuildingGenerator
  ├── LightingManager
  ├── CameraController
  ├── GridManager
  ├── SelectionManager
  ├── MoveManager, RotateManager, ScaleManager
  ├── Shape2DManager, TreeManager, PolygonManager, etc.
  ├── UIManager (receives all managers)
  ├── STLManager (receives UIManager reference)
  ├── SceneOperationsManager (receives UIManager reference)
  ├── PropertiesPopupManager (receives UIManager reference)
  ├── ToolManager (receives UIManager reference)
  └── TransformInputManager (receives UIManager reference)
```

### Event Flow:

1. **User Action** → UI Event
2. **UI Event** → Manager Method
3. **Manager Method** → Scene Update
4. **Scene Update** → `sceneChanged` Event
5. **Event Listener** → UI Update

### Selection Flow:

1. User clicks object
2. `SelectionManager.selectObject()` called
3. `selectionChanged` event dispatched
4. `UIManager.onSelectionChanged()` called
5. Properties popup shown (via `PropertiesPopupManager`)
6. Transform input fields updated (via `TransformInputManager`)

## نکات مهم برای توسعه

### هنگام اضافه کردن Feature جدید:

1. **بررسی کنید**: آیا ماژول مناسب وجود دارد؟
2. **اگر وجود دارد**: کد را در همان ماژول اضافه کنید
3. **اگر وجود ندارد**: ماژول جدید ایجاد کنید
4. **هرگز**: همه چیز را در `UIManager.js` ننویسید

### هنگام Refactoring:

1. **شناسایی**: بخش‌های بزرگ در یک فایل
2. **جداسازی**: استخراج به ماژول جدید
3. **Dependency Injection**: dependencies را از constructor بدهید
4. **تست**: اطمینان حاصل کنید که همه چیز کار می‌کند
5. **به‌روزرسانی**: `app.js` برای initialize کردن ماژول جدید

### هنگام Debugging:

1. **Console logs**: استفاده از `console.log` با prefix (مثل `[Duplicate]`, `[STL]`)
2. **Breakpoints**: استفاده از debugger
3. **Event tracing**: دنبال کردن event flow
4. **State inspection**: بررسی `userData` و `metadata`

## فایل‌های مهم

### `app.js`
- نقطه ورود اصلی
- Initialize کردن همه managers
- تنظیم dependencies بین managers

### `UIManager.js`
- **هنوز بزرگ است** (~8000+ خط)
- بیشتر functionality به ماژول‌های دیگر منتقل شده
- هنوز شامل helper methods و coordination logic است

### `index.html`
- ساختار UI
- شامل dialogs و popups
- Script tags باید به ترتیب dependency load شوند

## مشکلات رایج و راه‌حل‌ها

### مشکل: Double-flipping normals در polygon
**راه‌حل**: چک کردن `sideWallNormalsFlipped` flag قبل از flip

### مشکل: Duplicate کردن polygon کار نمی‌کند
**راه‌حل**: اطمینان از اینکه `points` به عنوان `Vector3` objects حفظ شوند

### مشکل: Scaling دو بار اعمال می‌شود
**راه‌حل**: استفاده از original dimensions + scaling property (نه scaling در dimensions)

### مشکل: Properties popup کار نمی‌کند
**راه‌حل**: اطمینان از اینکه `currentShape`, `currentTree`, etc. در `UIManager` تنظیم شده‌اند

## چک‌لیست برای AI

قبل از شروع کار، این موارد را بررسی کنید:

- [ ] آیا feature جدید نیاز به ماژول جدید دارد؟
- [ ] آیا می‌توانم از ماژول موجود استفاده کنم؟
- [ ] آیا کد من ماژولار است؟
- [ ] آیا فایل من بیش از 3000 خط است؟
- [ ] آیا dependencies را از constructor می‌گیرم؟
- [ ] آیا نام‌گذاری اشیاء درست است (بدون underscore)？
- [ ] آیا `userData` و `metadata` را به درستی مدیریت می‌کنم؟
- [ ] آیا duplicate کردن همه properties را حفظ می‌کند؟
- [ ] آیا normals را به درستی مدیریت می‌کنم (برای polygon)؟

## خلاصه

**اصل طلایی**: 
> **همه چیز باید ماژولار باشد. هرگز تمام functionality را در یک فایل ننویسید. اگر فایلی بزرگ شد، آن را refactor کنید.**

**هدف**: 
- کد قابل نگهداری
- کد قابل تست
- کد قابل توسعه
- کد قابل فهم

---

**آخرین به‌روزرسانی**: پس از refactoring UIManager به ماژول‌های کوچکتر (STLManager, SceneOperationsManager, PropertiesPopupManager, ToolManager, TransformInputManager)

**نسخه**: 1.0

