# Decimen Optical Transfer

Arkadaşlarınla aynı ortamdayken bir görseli yalnızca **ekran ve kamera** ile
aktaran, fountain-coded QR tabanlı eğlencelik bir optik ışınlama aracı.

- Ağ bağlantısı, backend, veritabanı, eşleşme veya hesap yoktur.
- Payload cihazlar arasında ışıkla taşınır.
- PNG, JPG ve animasyonlu GIF desteklenir.
- Tek sayfada **Yayınla**, **Oku** ve **Hız Düellosu** modları bulunur.
- Proje Vite ile tamamen statik build üretir.

## Çalıştırma

```bash
npm install
npm run dev
```

Vite geliştirme sunucusu HTTPS kullanır. Gönderen ve alıcı cihazlarda aynı
adresi açıp üstteki mod seçiciden rolü seç:

1. Gönderen cihazda **Yayınla** moduna geç, bir görsel seç ve önizlemeyi
   kontrol ettikten sonra **Işınlamayı başlat** düğmesine bas.
2. Alıcı cihazda **Oku** moduna geç, **Kamerayı başlat** düğmesine dokun ve
   kamerayı hareketli QR koda doğrult.
3. Görsel tamamlanınca hash doğrulanır, gelen baytlar bir `Blob` ve object URL
   üzerinden gösterilir. GIF ise tarayıcıda kendiliğinden oynar.

Eski `/send/` ve `/receive/` geliştirme adresleri birleşik sayfadaki ilgili
moda yönlenir. Statik build yalnızca kök `index.html` üretir.

## Hız Düellosu

Herkes kendi cihazında **Hız Düellosu** modunu açıp aynı vericiyi çeker.
Alıcı ekranında canlı olarak şunlar gösterilir:

- kısa kayan pencere üzerinden anlık KB/s,
- toplanan benzersiz kare sayısı,
- kare bazlı tahmini tamamlanma yüzdesi.

Bitişte cihazın kendi toplam süresi ve ortalama KB/s değeri görünür. Cihazlar
arasında otomatik sıralama veya veri paylaşımı yapılmaz; sonucu yan yana
karşılaştırırsınız. Böylece düello da bütünüyle sunucusuz kalır.

## Dosya boyutu ve yeniden boyutlandırma

Verici ayarlarında 512 KB ve 2 MB payload limit profilleri bulunur. Seçilen
görsel aktif limiti aşarsa yayın başlamaz ve limit açıkça gösterilir.

PNG/JPG görseller isteğe bağlı olarak tarayıcı içinde, `canvas` kullanılarak
otomatik küçültülebilir. GIF yeniden kodlandığında animasyonu kaybolacağı için
GIF dosyalarında otomatik küçültme yapılmaz; bunun yerine daha küçük bir GIF
seçilmesi istenir. Hiçbir dosya bir servise yüklenmez.

## Güvenli bağlam zorunluluğu

Alıcı `getUserMedia` kullanır. Tarayıcılar bu API'yi güvenli olmayan
origin'lerde sunmaz; `localhost` istisnası başka cihazdan erişim için geçerli
değildir. Telefonda LAN adresini açarken bu nedenle **HTTPS zorunludur**.

Geliştirme sunucusu `@vitejs/plugin-basic-ssl` ile kendinden imzalı sertifika
kullanır. Telefonda ilk açılışta sertifika uyarısını bir kez geçmek gerekir.
GitHub Pages, Netlify ve Vercel gibi statik hostlar zaten HTTPS sağlar.

## Statik build ve deploy

```bash
npm run build
```

Çıktı `dist/` klasöründedir. `vite.config.ts` içindeki göreli `base: "./"`
sayesinde klasör doğrudan GitHub Pages, Netlify, Vercel veya başka bir statik
hosta yüklenebilir. Uygulamanın çalışma zamanında bir API, backend veya harici
servis çağrısı yoktur; ZXing WASM dosyası da build'in kendi asset'idir.

## Mimari

Optik protokol bilinçli olarak önceki yapıyla aynı bırakılmıştır:

- `shared/fountain.ts`: deterministik robust-soliton dağılımlı LT fountain
  encoder/decoder,
- `shared/protocol.ts`: 20 baytlık kendini tanımlayan frame header'ı, session-id
  ve FNV-1a payload hash'i,
- `send/main.ts`: seçilen dosyayı sonsuz fountain-coded QR akışına çeviren
  verici,
- `receive/main.ts`: kamera karelerini worker'lara dağıtan ve fountain decoder'ı
  besleyen alıcı,
- `receive/worker.ts`: `zxing-wasm` QR decode worker'ı,
- `main.ts`: üç modun tek sayfadaki yaşam döngüsü.

Her verici başlangıcında ve ayar değişikliğinde yeni bir session-id üretilir.
Alıcı yeni session-id gördüğünde el sıkışma olmadan yeni stream'e geçer.

### Neden ilerleme blok sayısından hesaplanmıyor?

LT peeling çözümü blokları sonlara doğru kümeli biçimde çözer. Çözülen blok
sayısı kullanılırsa progress bar uzun süre takılmış gibi görünür ve aniden
%100'e sıçrar. Bu arayüz ilerlemeyi özellikle **toplanan benzersiz QR kareleri**
üzerinden, beklenen `K × 1.18` kareye göre hesaplar; tamamlanmadan önce en fazla
%99, decoder tamamlandığında %100 gösterir.

## Ayarlar

Verici ayarları:

- payload limiti (512 KB / 2 MB),
- tx fps,
- bytes/frame,
- QR error correction (ECC),
- ekrandaki QR boyutu.

Alıcı ve düello ayarları:

- kamera genişliği,
- capture fps,
- ZXing worker sayısı.

QR katmanında düşük ECC varsayılandır; fountain katmanı kayıp kareleri tolere
eder. iOS'ta 1280 genişlikte 60 FPS isteği önce `exact`, desteklenmezse `ideal`
olarak denenir. `requestVideoFrameCallback` zincirleri generation counter ile
mod/kamera yaşam döngüsüne bağlanır.

## License

MIT
