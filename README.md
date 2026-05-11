# MyHive: Bir Arıcılık Yönetim Çözümü

## Tanıtım

MyHive, çeşitli konumlara yayılmış her sayıda kovanda gerçekleştirilen tüm değişiklikleri takip etme sorununa yönelik hepsi bir arada esnek bir çözümdür. MyHive, kovan denetimi sırasında yapılan tüm eylemleri günlüğe kaydetmek için uzak kaynakları kullanan sezgisel, duyarlı bir kullanıcı arayüzü sağlayarak bunu başarır.

## Kurulum Adımları ve Çalıştırma Talimatları

### Gereksinimler

- Python 3.7 veya üzeri
- pip (Python paket yöneticisi)

### Kurulum Adımları

1. **Repoyu Klonlayın:**

   ```
   git clone https://github.com/hazu-7/Apiary_Manager.git
   cd Apiary_Manager
   ```

2. **Sanal Ortam Oluşturun:**

   ```
   python -m venv venv
   ```

   #### **Linux/Mac :**

   Sanal Ortamda SECRET_KEY değişkeni atayın ("mysecret"ı değiştirin)

   ```
   echo "SECRET_KEY='mysecret'" >> .env
   ```

   Sanal Ortamda otomatik oluşturan kullanıcının şifresini atayın ("mypassword"'ı değiştiriniz)

   ```
   echo "INITIAL_PASSWORD='mypassword'" >> .env
   ```

   #### **Windows (PowerShell):**

   Sanal Ortamda SECRET_KEY değişkeni atayın (süslü parantez arasındaki metini değiştirin)

   ```
   Add-Content .env "SECRET_KEY='mysecret'"
   ```

   Sanal Ortamda otomatik oluşturan kullanıcının şifresini atayın (süslü parantez arasındaki metini değiştirin)

   ```
   Add-Content .env "INITIAL_PASSWORD='mypassword'"

   ```

3. **Sanal Ortamı Aktifleştirin:**

   #### **Linux/Mac:**

   ```
   source venv/bin/activate
   ```

   #### **Windows:**

   ```
   venv\Scripts\activate
   ```

4. **Bağımlılıkları Yükleyin:**

   ```
   pip install flask flask-sqlalchemy flask-cors werkzeug python-dotenv
   ```

## Çalıştırma Talimatları

1. **Uygulamayı Başlatın:**

   ```
   python app.py
   ```

2. **Tarayıcıda Açın:**
   Tarayıcınızda `http://localhost:5000` adresine gidin.

3. **Uygulamayı Kullanın:**
   - Giriş yapın veya kayıt olun.
   - Kovanlarınızı, kraliçe arılarınızı ve kontrollerinizi yönetin.

## Ek Notlar

- Uygulama SQLite veritabanı kullanır ve `MyHive.db` dosyası oluşturulacaktır.
- Varsayılan kullanıcının adı 'admin'
- Ortam değişkenlerini atamadıysanız default olarak varsayılan kullanıcının şifresi 'admin'
- Yüklenen dosyalar `static/uploads/` klasöründe saklanır.
- Oturum süresi 14 gündür.

Herhangi bir sorun yaşarsanız, lütfen GitHub deposundaki sorunlar bölümüne bakın.
