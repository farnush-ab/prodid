# پترن‌های پیامکی پرودید

برند: پرودید
قالب متغیر در متن پترن: `%fieldName%`
ارسال از طریق IPPanel: [docs/send](https://docs.ippanel.com/docs/send/)

```
POST https://edge.ippanel.com/v1/api/send
Authorization: <IPPANEL_API_KEY>
Content-Type: application/json

{
  "sending_type": "pattern",
  "from_number": "<IPPANEL_FROM>",
  "code": "<کد پترن ثبت‌شده>",
  "recipients": ["09xxxxxxxxx"],
  "params": { "orderNo": "PD000001", "name": "علی" }
}
```

کلیدهای `params` همان نام متغیر بدون `%` هستند. اگر پنل نقطه در `customer.name` را رد کرد، پترن را با `%name%` ثبت کن؛ سرور هر دو را می‌فرستد.

توکن‌ها باید با فیلدهای پلتفرم یکی باشند (`orderNo` نه `order_no`). مسیرها از `PublicOrder` / `OrderDoc`، `UserDoc`، `Product`، `Coupon`، `OtpLimits` و متغیر `code` در `app/api/auth/otp/route.ts` آمده‌اند.

`day` و `slot` در دیتابیس `today` / `9-12` هستند. در متن پیامک **لیبل فارسی** فرستاده می‌شود (`dayLabel` / `slotLabel`).

پیام‌های سفارش، پرداخت و OTP را روی خط **خدماتی** ثبت کن. تخفیف، تولد و موجود شدن کالا معمولاً **تبلیغاتی**اند.

پترن‌های حذف‌شده (ارسال نمی‌شوند): ساخت حساب، ارسال مجدد کد تایید، کارت به کارت. ارسال مجدد OTP همان پترن «کد تایید» را تکرار می‌کند.

---

## نگاشت فیلد → توکن

| مسیر در کد | توکن پیامک | اگر نقطه قبول نشد |
|---|---|---|
| `order.orderNo` | `%orderNo%` | — |
| `order.customer.name` | `%customer.name%` | `%name%` |
| `order.customer.phone` | `%customer.phone%` | `%phone%` |
| `order.day` (لیبل با `dayLabel`) | `%day%` | — |
| `order.slot` (لیبل با `slotLabel`) | `%slot%` | — |
| `order.estimatedTotal` | `%estimatedTotal%` | — |
| `order.finalTotal` | `%finalTotal%` | — |
| `order.paymentMethod` (لیبل با `PAY_METHOD_LABEL`) | `%paymentMethod%` | — |
| `order.paymentStatus` | `%paymentStatus%` | — |
| `order.status` (لیبل با `ORDER_STATUS_LABEL`) | `%status%` | — |
| `order.notes` | `%notes%` | — |
| `order.zarinpalRefId` | `%zarinpalRefId%` | — |
| `order.deliveryFee` | `%deliveryFee%` | — |
| `settings.payments.cardHolder` | `%cardHolder%` | — |
| `settings.payments.cardNumber` | `%cardNumber%` | — |
| `settings.payments.bankName` | `%bankName%` | — |
| `user.name` | `%user.name%` | `%name%` |
| `user.phone` | `%phone%` | — |
| `coupon.code` | `%code%` | — |
| `coupon.percent` | `%percent%` | — |
| `coupon.expiresAt` | `%expiresAt%` | — |
| `product.name` | `%product.name%` | `%name%` (فقط در پیام موجودی کالا) |
| `product.id` | `%id%` | — |
| متغیر `code` در OTP route | `%code%` | نه `%token%` |
| `settings.otp.ttlMinutes` | `%ttlMinutes%` | — |

---

## ۱. فرایند سفارش آنلاین

مراحل `status`: `pending` → `confirmed` → `preparing` → `delivering` → `delivered` / `cancelled`

### ۱.۱ ثبت سفارش (`status: pending`)

**عنوان پترن:** ثبت سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% ثبت شد و در انتظار تایید است.
مبلغ تقریبی: %estimatedTotal% تومان
پرودید
```

**توضیحات پترن:** ارسال بلافاصله پس از ثبت سفارش آنلاین (`POST /api/orders`) وقتی `status` برابر `pending` است. مبلغ همان `estimatedTotal` است چون `finalTotal` هنوز `null` است.

**متغیرها:** `%customer.name%` `%orderNo%` `%estimatedTotal%`

---

### ۱.۲ تایید سفارش (`status: confirmed`)

**عنوان پترن:** تایید سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% تایید شد.
زمان تحویل: %day% ساعت %slot%
پرودید
```

**توضیحات پترن:** ارسال وقتی `status` از `pending` به `confirmed` می‌رود. `%day%` و `%slot%` با `dayLabel` و `slotLabel` پر شوند.

**متغیرها:** `%customer.name%` `%orderNo%` `%day%` `%slot%`

---

### ۱.۳ آماده‌سازی سفارش (`status: preparing`)

**عنوان پترن:** آماده‌سازی سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% در حال آماده‌سازی است.
پرودید
```

**توضیحات پترن:** ارسال وقتی وضعیت سفارش `preparing` می‌شود و فروشگاه در حال وزن‌کشی و بسته‌بندی است.

**متغیرها:** `%customer.name%` `%orderNo%`

---

### ۱.۴ ارسال سفارش (`status: delivering`)

**عنوان پترن:** ارسال سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% در مسیر ارسال است.
بازه تحویل: %slot%
پرودید
```

**توضیحات پترن:** ارسال وقتی `status` برابر `delivering` است و پیک حرکت کرده.

**متغیرها:** `%customer.name%` `%orderNo%` `%slot%`

---

### ۱.۵ تحویل سفارش (`status: delivered`)

**عنوان پترن:** تحویل سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% تحویل داده شد. نوش جان.
پرودید
```

**توضیحات پترن:** ارسال پس از تحویل موفق، وقتی `status` برابر `delivered` است.

**متغیرها:** `%customer.name%` `%orderNo%`

---

### ۱.۶ لغو سفارش (`status: cancelled`)

فیلد `reason` در مدل سفارش نیست. توضیح لغو اگر باشد داخل `notes` است.

**عنوان پترن:** لغو سفارش

**متن پترن:**
```
%customer.name% عزیز سفارش %orderNo% لغو شد.
%notes%
پرودید
```

**توضیحات پترن:** ارسال وقتی `status` برابر `cancelled` می‌شود. اگر `notes` خالی بود همان رشته خالی بفرست؛ متن اضافه نساز.

**متغیرها:** `%customer.name%` `%orderNo%` `%notes%`

---

### ۱.۷ پرداخت آنلاین موفق (`paymentMethod: "online"` و `paymentStatus: "paid"`)

**عنوان پترن:** پرداخت موفق

**متن پترن:**
```
%customer.name% عزیز پرداخت سفارش %orderNo% به مبلغ %estimatedTotal% تومان انجام شد.
رسید: %zarinpalRefId%
پرودید
```

**توضیحات پترن:** ارسال پس از تایید موفق زرین‌پال وقتی `paymentStatus` برابر `paid` است. رسید همان `zarinpalRefId` است.

**متغیرها:** `%customer.name%` `%orderNo%` `%estimatedTotal%` `%zarinpalRefId%`

---

### ۱.۸ پرداخت آنلاین ناموفق (`paymentStatus: "failed"`)

**عنوان پترن:** پرداخت ناموفق

**متن پترن:**
```
%customer.name% عزیز پرداخت سفارش %orderNo% انجام نشد. برای تلاش مجدد وارد حساب کاربری شوید.
پرودید
```

**توضیحات پترن:** ارسال وقتی پرداخت آنلاین ناموفق می‌ماند و `paymentStatus` برابر `failed` است.

**متغیرها:** `%customer.name%` `%orderNo%`

---

## ۲. تخفیف‌ها

فیلدها در مدل `Coupon`: `code`، `percent`، `kind` (`public` | `loyalty` | `birthday`)، `expiresAt`.

### ۲.۱ تخفیف عمومی فروشگاه

**عنوان پترن:** تخفیف عمومی

**متن پترن:**
```
%user.name% عزیز تخفیف %percent% درصدی پرودید تا %expiresAt% با کد %code% فعال است.
پرودید
```

**توضیحات پترن:** اطلاع‌رسانی تخفیف دوره‌ای (`kind: public`). متغیرها از `coupon.percent`، `coupon.code` و `coupon.expiresAt`.

**متغیرها:** `%user.name%` `%percent%` `%expiresAt%` `%code%`
**env:** `IPPANEL_PATTERN_COUPON_PUBLIC`

---

### ۲.۲ تخفیف مشتری ثابت

**عنوان پترن:** تخفیف مشتری ثابت

**متن پترن:**
```
%user.name% عزیز مشتری ثابت پرودید، تخفیف ویژه %percent% درصدی مخصوص شما تا %expiresAt% با کد %code%
پرودید
```

**توضیحات پترن:** برای مشتریان وفادار (`kind: loyalty`) با حداقل سفارش `minOrders`.

**متغیرها:** `%user.name%` `%percent%` `%expiresAt%` `%code%`
**env:** `IPPANEL_PATTERN_COUPON_LOYALTY`

---

## ۳. تبریک تولد

تاریخ تولد: `User.birthDate` به صورت `YYYY-MM-DD`. کد از کوپن `kind: birthday`.

### ۳.۱ تولد به همراه تخفیف

**عنوان پترن:** تبریک تولد

**متن پترن:**
```
%user.name% عزیز تولدت مبارک. هدیه پرودید %percent% درصد تخفیف با کد %code% تا %expiresAt%
پرودید
```

**توضیحات پترن:** در روز تولد مشتری (`isBirthdayToday(user.birthDate)`).

**متغیرها:** `%user.name%` `%percent%` `%code%` `%expiresAt%`
**env:** `IPPANEL_PATTERN_BIRTHDAY`

---

## ۴. موجود شدن محصول

منبع: `Product.available` وقتی از `false` به `true` می‌رود. گیرنده از `User` است.

### ۴.۱ اطلاع موجودی مجدد

**عنوان پترن:** موجود شدن محصول

**متن پترن:**
```
%user.name% عزیز محصول %product.name% دوباره موجود شد.
پرودید
```

**توضیحات پترن:** ارسال به مشتریانی که موجود شدن کالا را پیگیری کرده‌اند، وقتی `product.available` برابر `true` می‌شود.

**متغیرها:** `%user.name%` `%product.name%`
**env:** `IPPANEL_PATTERN_RESTOCK`

---

## ۵. OTP ورود و ثبت‌نام

ورود و ثبت‌نام یک فلو هستند. یک پترن کد تایید برای هر دو و برای ارسال مجدد کافی است. اولین `signIn("phone-otp")` با `upsert` حساب می‌سازد.

کد خام در دیتابیس ذخیره نمی‌شود (`codeHash`). توکن پیامک همان متغیر `code` در `generateOtp()` است. اعتبار از `otp.ttlMinutes` می‌آید (پیش‌فرض `2`).

### ۵.۱ کد تایید (ورود، ثبت‌نام، ارسال مجدد)

**عنوان پترن:** کد تایید

**متن پترن:**
```
کد تایید شما: %code%
این کد تا %ttlMinutes% دقیقه معتبر است.
پرودید
```

**توضیحات پترن:** ارسال در `POST /api/auth/otp` بعد از `generateOtp()`، از جمله وقتی کاربر «ارسال مجدد» می‌زند. کد شش رقم است. `%ttlMinutes%` از `settings.otp.ttlMinutes` خوانده می‌شود.

**متغیرها:** `%code%` `%ttlMinutes%`
**env:** `IPPANEL_PATTERN_OTP`

---

## جدول ثبت در پنل

| عنوان | رویداد | env پترن | متغیرها |
|---|---|---|---|
| ثبت سفارش | `status: pending` | `IPPANEL_PATTERN_ORDER_PENDING` | `%customer.name%` `%orderNo%` `%estimatedTotal%` |
| تایید سفارش | `status: confirmed` | `IPPANEL_PATTERN_ORDER_CONFIRMED` | `%customer.name%` `%orderNo%` `%day%` `%slot%` |
| آماده‌سازی سفارش | `status: preparing` | `IPPANEL_PATTERN_ORDER_PREPARING` | `%customer.name%` `%orderNo%` |
| ارسال سفارش | `status: delivering` | `IPPANEL_PATTERN_ORDER_DELIVERING` | `%customer.name%` `%orderNo%` `%slot%` |
| تحویل سفارش | `status: delivered` | `IPPANEL_PATTERN_ORDER_DELIVERED` | `%customer.name%` `%orderNo%` |
| لغو سفارش | `status: cancelled` | `IPPANEL_PATTERN_ORDER_CANCELLED` | `%customer.name%` `%orderNo%` `%notes%` |
| پرداخت موفق | `paymentStatus: paid` | `IPPANEL_PATTERN_PAY_PAID` | `%customer.name%` `%orderNo%` `%estimatedTotal%` `%zarinpalRefId%` |
| پرداخت ناموفق | `paymentStatus: failed` | `IPPANEL_PATTERN_PAY_FAILED` | `%customer.name%` `%orderNo%` |
| تخفیف عمومی | `coupon.kind: public` | `IPPANEL_PATTERN_COUPON_PUBLIC` | `%user.name%` `%percent%` `%expiresAt%` `%code%` |
| تخفیف مشتری ثابت | `coupon.kind: loyalty` | `IPPANEL_PATTERN_COUPON_LOYALTY` | `%user.name%` `%percent%` `%expiresAt%` `%code%` |
| تبریک تولد | `kind: birthday` + `birthDate` | `IPPANEL_PATTERN_BIRTHDAY` | `%user.name%` `%percent%` `%code%` `%expiresAt%` |
| موجود شدن محصول | `product.available: true` | `IPPANEL_PATTERN_RESTOCK` | `%user.name%` `%product.name%` |
| کد تایید | `POST /api/auth/otp` (و ارسال مجدد) | `IPPANEL_PATTERN_OTP` | `%code%` `%ttlMinutes%` |

---

## نام‌های منسوخ — استفاده نشوند

| غلط | درست |
|---|---|
| `%order_no%` | `%orderNo%` |
| `%amount%` | `%estimatedTotal%` یا `%finalTotal%` |
| `%token%` | `%code%` |
| `%minutes%` | `%ttlMinutes%` |
| `%reason%` | `%notes%` |
| `%discount%` `%expire%` | `%percent%` `%expiresAt%` |
| `%product%` | `%product.name%` |
