import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'RandevuCep Gizlilik Politikası — kişisel verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuza dair bilgi.',
}

const LAST_UPDATED = '1 Mart 2026'

export default function PrivacyPage() {
  return (
    <main className={styles.content}>
      <div className={styles.pageHeader}>
        <div className={styles.badge}>Hukuki</div>
        <h1 className={styles.pageTitle}>Gizlilik Politikası</h1>
        <p className={styles.pageMeta}>Son güncelleme: {LAST_UPDATED}</p>
      </div>

      <article className={styles.prose}>
        <p>
          RandevuCep (&quot;biz&quot;, &quot;şirket&quot;) olarak gizliliğinize önem veriyoruz. Bu Gizlilik
          Politikası, randevucep.com web sitesini ve ilgili uygulamaları (&quot;Hizmet&quot;)
          kullanırken kişisel verilerinizi nasıl topladığımızı, kullandığımızı, sakladığımızı
          ve koruduğumuzu açıklamaktadır.
        </p>

        <h2>1. Topladığımız Veriler</h2>
        <p>
          Hizmetimizi kullanırken aşağıdaki kategorilerde kişisel veriler toplayabiliriz:
        </p>
        <ul>
          <li><strong>Kimlik ve iletişim bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası.</li>
          <li><strong>İşletme bilgileri:</strong> İşletme adı, adresi, faaliyet türü.</li>
          <li><strong>Randevu bilgileri:</strong> Alınan ve verilen randevulara ilişkin tarih, saat ve içerik bilgileri.</li>
          <li><strong>Ödeme bilgileri:</strong> Ödeme işlemleri iyzico altyapısı üzerinden gerçekleştirilmekte olup kart bilgileriniz tarafımızca saklanmamaktadır.</li>
          <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, ziyaret tarihleri ve kullanım verileri.</li>
        </ul>

        <h2>2. Verilerin Kullanım Amaçları</h2>
        <p>Topladığımız kişisel verileri aşağıdaki amaçlarla işliyoruz:</p>
        <ul>
          <li>Hizmetlerimizi sunmak ve iyileştirmek,</li>
          <li>Randevu bildirimleri ve hatırlatmalar göndermek,</li>
          <li>Ödeme işlemlerini gerçekleştirmek,</li>
          <li>Müşteri desteği sağlamak,</li>
          <li>Yasal yükümlülüklerimizi yerine getirmek.</li>
        </ul>

        <h2>3. Verilerin Paylaşımı</h2>
        <p>
          Kişisel verilerinizi; açık rızanız olmaksızın üçüncü taraflarla ticari amaçla
          paylaşmıyoruz. Yalnızca hizmetin işleyişi için zorunlu olan teknik altyapı
          sağlayıcılarımız (Supabase, Vercel, Resend, iyzico) ile ve yasal zorunluluk
          halinde resmi makamlarla paylaşım yapabiliriz.
        </p>

        <h2>4. Veri Güvenliği</h2>
        <p>
          Verilerinizi korumak amacıyla endüstri standardı şifreleme, güvenli iletim
          protokolleri (HTTPS) ve erişim kontrol mekanizmalarını kullanıyoruz. Bununla
          birlikte hiçbir internet iletiminin %100 güvenli olmadığını hatırlatmak isteriz.
        </p>

        <h2>5. Çerezler</h2>
        <p>
          Hizmetimiz, oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla
          çerez ve benzeri teknolojiler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri
          devre dışı bırakabilirsiniz; ancak bu durumda bazı hizmetlerimiz düzgün
          çalışmayabilir.
        </p>

        <h2>6. Veri Saklama Süreleri</h2>
        <p>
          Kişisel verilerinizi, hizmetimizden yararlandığınız süre boyunca ve sonrasında
          yasal yükümlülükler kapsamında belirlenen süreler dahilinde saklarız. Hesabınızı
          silmeniz durumunda verileriniz, yasal saklama yükümlülükleri saklı kalmak kaydıyla,
          otuz (30) gün içinde sistemlerimizden kaldırılır.
        </p>

        <h2>7. Haklarınız</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında aşağıdaki
          haklara sahipsiniz:
        </p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>Verilerin düzeltilmesini isteme,</li>
          <li>Verilerin silinmesini veya yok edilmesini talep etme,</li>
          <li>İşlemeye itiraz etme.</li>
        </ul>
        <p>
          Bu haklarınızı kullanmak için{' '}
          <a href="mailto:kvkk@randevucep.com">kvkk@randevucep.com</a> adresine
          yazabilirsiniz. Daha ayrıntılı bilgi için{' '}
          <a href="/kvkk">KVKK Aydınlatma Metnimizi</a> inceleyebilirsiniz.
        </p>

        <h2>8. Politika Değişiklikleri</h2>
        <p>
          Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikleri
          e-posta veya uygulama içi bildirimle size duyuracağız. Güncel politikayı her
          zaman bu sayfada bulabilirsiniz.
        </p>

        <h2>9. İletişim</h2>
        <p>
          Gizlilik politikamıza ilişkin sorularınız için{' '}
          <a href="mailto:destek@randevucep.com">destek@randevucep.com</a> adresinden
          bize ulaşabilirsiniz.
        </p>
      </article>
    </main>
  )
}
