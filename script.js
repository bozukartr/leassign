// Veri yapıları
let leas = [];
let villas = [];
let assignments = [];
let editingAssignment = null; // Düzenlenen atama

// Firebase Yapılandırması ve Başlatma
const firebaseConfig = {
  apiKey: "AIzaSyAespGn8xrrAPqr4WVzLpoozo7M6xHxx0k",
  authDomain: "leassign-4a0d8.firebaseapp.com",
  projectId: "leassign-4a0d8",
  storageBucket: "leassign-4a0d8.firebasestorage.app",
  messagingSenderId: "130562043051",
  appId: "1:130562043051:web:8715f72efc00f83b8b1bee",
  measurementId: "G-RBMBJS3VDZ"
};

// Firebase başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Sabit Tanımlamalar
const VILLA_TYPES = {
    PRESIDENTIAL: 'Presidential',
    SUNSET: 'Sunset',
    CITRUS: 'Citrus',
    FOREST: 'Forest',
    MAKI: 'Maki',
    PINA: 'Pina'
};

const LEA_CATEGORIES = {
    LEA: 'LEA',
    FLOOR_BUTLER: 'Floor Butler'
};

// Form ve UI elementleri
const leaSelect = document.getElementById('leaSelect');
const secondaryLeaSelect = document.getElementById('secondaryLeaSelect');
const villaSelect = document.getElementById('villaSelect');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const assignmentForm = document.getElementById('assignmentForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const totalLeasSpan = document.getElementById('totalLeas');
const totalVillasSpan = document.getElementById('totalVillas');
const activeAssignmentsSpan = document.getElementById('activeAssignments');

// JSON Veri Yükleme Fonksiyonları
async function loadJSONData() {
    try {
        // LEA'ları Firestore'dan yükle
        const leaSnapshot = await db.collection('leas').get();
        leas = leaSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                isim: data.isim, 
                kategori: data.kategori || LEA_CATEGORIES.LEA,
                isActive: true
            };
        });

        // Villaları Firestore'dan yükle
        const villaSnapshot = await db.collection('villas').get();
        villas = villaSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                isim: data.isim, 
                kategori: data.kategori,
                tip: getVillaType(data.kategori),
                isActive: true
            };
        });

        // LocalStorage'dan atamaları yükle
        loadAssignmentsFromStorage();
        updateUI();
        updateQuickStats();
        
        console.log("Tüm veriler başarıyla yüklendi");
        return true; // Başarılı yükleme
    } catch (error) {
        console.error("Firebase veri yükleme hatası:", error);
        
        // Hata durumunda backup olarak JSON dosyalarından yüklemeyi dene
        console.log("JSON dosyalarından yükleme deneniyor...");
        return loadFromJSONFiles();
    }
}

// Yedek olarak JSON dosyalarından yükleme
async function loadFromJSONFiles() {
    try {
        // LEA'ları JSON dosyasından yükle
        const leaResponse = await fetch('leas.json');
        const leaData = await leaResponse.json();
        leas = leaData.map(item => {
            return { 
                id: item.id, 
                isim: item.isim, 
                kategori: item.kategori || LEA_CATEGORIES.LEA,
                isActive: true
            };
        });

        // Villaları JSON dosyasından yükle
        const villaResponse = await fetch('villas.json');
        const villaData = await villaResponse.json();
        villas = villaData.map(item => {
            return { 
                id: item.id, 
                isim: item.isim, 
                kategori: item.kategori,
                tip: getVillaType(item.kategori),
                isActive: true
            };
        });

        // Özel olarak 3002 numaralı villanın kategori bilgisini güncelle
        updateVilla3002();

        // LocalStorage'dan atamaları yükle
        loadAssignmentsFromStorage();
        updateUI();
        updateQuickStats();
        
        console.log("JSON veriler başarıyla yüklendi");
        return true; // Başarılı yükleme
    } catch (error) {
        console.error("JSON veri yükleme hatası:", error);
        throw error; // Hata durumunda dışarı throw
    }
}

// Villa tipini belirle
function getVillaType(kategori) {
    if (!kategori) return 'Diğer';
    kategori = kategori.toLowerCase();
    
    if (kategori.includes('presidential')) return VILLA_TYPES.PRESIDENTIAL;
    if (kategori.includes('sunset')) return VILLA_TYPES.SUNSET;
    if (kategori.includes('citrus')) return VILLA_TYPES.CITRUS;
    if (kategori.includes('forest')) return VILLA_TYPES.FOREST;
    if (kategori.includes('maki')) return VILLA_TYPES.MAKI;
    if (kategori.includes('pina')) return VILLA_TYPES.PINA;
    return 'Diğer';
}

// LocalStorage fonksiyonları
function saveToLocalStorage() {
    localStorage.setItem('leas', JSON.stringify(leas));
    localStorage.setItem('villas', JSON.stringify(villas));
    localStorage.setItem('assignments', JSON.stringify(assignments));
    
    // Firebase'e atamaları da kaydet (senkronizasyon)
    try {
        saveToFirestore();
    } catch (error) {
        console.error("Firebase senkronizasyon hatası:", error);
        // Hata olsa bile local storage'a kaydetmeye devam et
    }
}

// Atamaları Firestore'a kaydet
async function saveToFirestore() {
    try {
        // Yalnızca atamaları senkronize et (LEA ve Villalar genellikle statik)
        if (assignments.length > 0) {
            // Her bir atama için tek tek güncelleme yap
            assignments.forEach(async (assignment) => {
                const docRef = db.collection('assignments').doc(assignment.id);
                
                try {
                    // Belge zaten varsa güncelle, yoksa oluştur
                    await docRef.set(assignment);
                } catch (err) {
                    console.error(`Atama ${assignment.id} senkronize edilemedi:`, err);
                }
            });
            
            console.log('Atamalar Firebase ile senkronize edildi');
        }
    } catch (error) {
        console.error('Firebase senkronizasyon hatası:', error);
        throw error;
    }
}

function loadAssignmentsFromStorage() {
    const savedAssignments = localStorage.getItem('assignments');
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
    } else {
        // LocalStorage'da yoksa Firestore'dan almayı dene
        loadAssignmentsFromFirestore();
    }
}

// Atamaları Firestore'dan yükle
async function loadAssignmentsFromFirestore() {
    try {
        const assignmentsSnapshot = await db.collection('assignments').get();
        if (!assignmentsSnapshot.empty) {
            assignments = assignmentsSnapshot.docs.map(doc => doc.data());
            console.log('Atamalar Firestore\'dan yüklendi');
            
            // LocalStorage'a da kaydet
            localStorage.setItem('assignments', JSON.stringify(assignments));
        }
    } catch (error) {
        console.error('Firestore\'dan atama yükleme hatası:', error);
    }
}

function loadFromLocalStorage() {
    const savedLeas = localStorage.getItem('leas');
    const savedVillas = localStorage.getItem('villas');
    const savedAssignments = localStorage.getItem('assignments');

    if (savedLeas) leas = JSON.parse(savedLeas);
    if (savedVillas) villas = JSON.parse(savedVillas);
    if (savedAssignments) assignments = JSON.parse(savedAssignments);

    updateUI();
    updateQuickStats();
}

// Atama işlemleri
assignmentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const lea = leaSelect.value;
    const secondaryLea = secondaryLeaSelect.value; // İkinci LEA (opsiyonel)
    const villa = villaSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!lea || !villa || !startDate || !endDate) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Lütfen tüm zorunlu alanları doldurun!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    // Ana LEA ve ikinci LEA aynı olamaz
    if (secondaryLea && secondaryLea === lea) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Ana LEA ve ikinci LEA aynı olamaz!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (startDateTime >= endDateTime) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    // Eğer atama düzenleniyorsa, tarih çakışması kontrolünden mevcut atamayı hariç tutmalıyız
    // Tarih çakışması kontrolü
    const isOverlapping = assignments.some(assignment => {
        // Eğer düzenlenen atama ise, kendisiyle çakışma kontrolü yapma
        if (editingAssignment && assignment.id === editingAssignment.id) {
            return false;
        }
        
        return assignment.villa === villa &&
            new Date(startDate) <= new Date(assignment.endDate) &&
            new Date(endDate) >= new Date(assignment.startDate);
    });

    if (isOverlapping) {
        Swal.fire({
            title: 'Uyarı',
            text: 'Bu tarih aralığında villa zaten atanmış!',
            icon: 'warning',
            confirmButtonText: 'Tamam'
        });
        return;
    }

    if (editingAssignment) {
        // Mevcut atamayı güncelle
        const index = assignments.findIndex(a => a.id === editingAssignment.id);
        if (index !== -1) {
            assignments[index] = {
                ...editingAssignment,
                lea,
                secondaryLea: secondaryLea || null, // İkinci LEA
                villa,
                startDate,
                endDate,
                updatedAt: new Date().toISOString()
            };
        }
        
        // Düzenleme modundan çık
        editingAssignment = null;
        document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
        cancelEditBtn.style.display = 'none';
        document.querySelector('.quick-assign').classList.remove('editing');
    } else {
        // Yeni atama oluştur
        const newAssignment = {
            id: Date.now().toString(),
            lea,
            secondaryLea: secondaryLea || null, // İkinci LEA
            villa,
            startDate,
            endDate,
            createdAt: new Date().toISOString()
        };

        assignments.push(newAssignment);
    }

    saveToLocalStorage();
    updateUI();
    updateQuickStats();
    
    // Daily Brief'i güncelle
    updateDailyBrief();
    
    assignmentForm.reset();
    setDefaultDates();
    
    Swal.fire({
        title: 'Başarılı',
        text: editingAssignment ? 'Atama güncellendi!' : 'Yeni atama oluşturuldu!',
        icon: 'success',
        confirmButtonText: 'Tamam',
        timer: 1500,
        timerProgressBar: true
    });
});

// Atamayı düzenle
function editAssignment(id) {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;
    
    // Form değerlerini ayarla
    leaSelect.value = assignment.lea;
    secondaryLeaSelect.value = assignment.secondaryLea || ''; // İkinci LEA
    villaSelect.value = assignment.villa;
    startDateInput.value = assignment.startDate;
    endDateInput.value = assignment.endDate;
    
    // Düzenleme modu
    editingAssignment = assignment;
    
    // Buton metnini değiştir
    document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-save"></i> Değişiklikleri Kaydet';
    
    // İptal butonunu göster
    cancelEditBtn.style.display = 'inline-flex';
    
    // Form stilini düzenleme moduna göre değiştir
    document.querySelector('.quick-assign').classList.add('editing');
    
    // Forma odaklan
    document.querySelector('.quick-assign').scrollIntoView({ behavior: 'smooth' });
}

// Atamayı sil
function deleteAssignment(id) {
    Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu atamayı silmek istediğinizden emin misiniz?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal',
        confirmButtonColor: '#c62828',
        cancelButtonColor: '#6c757d'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const assignmentToDelete = assignments.find(a => a.id === id);
            if (!assignmentToDelete) return;
            
            // Local olarak atamayı sil
            assignments = assignments.filter(a => a.id !== id);
            saveToLocalStorage();
            updateUI();
            updateQuickStats();
            
            // Daily Brief'i güncelle
            updateDailyBrief();
            
            // Eğer silinen atama düzenleniyorsa, düzenleme modundan çık
            if (editingAssignment && editingAssignment.id === id) {
                editingAssignment = null;
                document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
                cancelEditBtn.style.display = 'none';
                document.querySelector('.quick-assign').classList.remove('editing');
                assignmentForm.reset();
                setDefaultDates();
            }
            
            // Firebase'den atamayı sil
            try {
                await db.collection('assignments').doc(id).delete();
                console.log('Atama Firebase\'den silindi');
            } catch (error) {
                console.error('Firebase silme hatası:', error);
                // Firebase'e erişilemiyor olsa bile local silme işlemi başarılı
            }
            
            Swal.fire({
                title: 'Silindi!',
                text: 'Atama başarıyla silindi.',
                icon: 'success',
                confirmButtonText: 'Tamam',
                timer: 1500,
                timerProgressBar: true
            });
        }
    });
}

// Arama ve filtreleme
searchInput.addEventListener('input', updateAssignments);
statusFilter.addEventListener('change', updateAssignments);

// Filter badge'leri için event listener'lar
document.querySelectorAll('.filter-badge').forEach(badge => {
    badge.addEventListener('click', function() {
        // Aktif badge'i kaldır
        document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
        
        // Tıklanan badge'i aktif yap
        this.classList.add('active');
        
        // Status filter değerini ayarla
        const filterValue = this.dataset.filter;
        statusFilter.value = filterValue;
        
        // Atamaları güncelle
        updateAssignments();
    });
});

// UI güncelleme fonksiyonları
function updateUI() {
    updateSelects();
    updateAssignments();
    updateLeaStats();
}

function updateQuickStats() {
    const today = new Date();
    const activeAssignments = assignments.filter(a => {
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        return start <= today && end >= today;
    });

    totalLeasSpan.textContent = leas.length;
    totalVillasSpan.textContent = villas.length;
    activeAssignmentsSpan.textContent = activeAssignments.length;
}

function updateSelects() {
    // LEA seçeneklerini güncelle
    leaSelect.innerHTML = '<option value="">LEA Seçin</option>';
    secondaryLeaSelect.innerHTML = '<option value="">İkinci LEA Seçin (Opsiyonel)</option>';
    
    leas.forEach(lea => {
        // Ana LEA seçeneği
        const option = document.createElement('option');
        option.value = lea.isim;
        option.textContent = `${lea.isim} (${lea.kategori})`;
        leaSelect.appendChild(option);
        
        // İkinci LEA seçeneği
        const option2 = document.createElement('option');
        option2.value = lea.isim;
        option2.textContent = `${lea.isim} (${lea.kategori})`;
        secondaryLeaSelect.appendChild(option2);
    });

    // Villa seçeneklerini güncelle
    villaSelect.innerHTML = '<option value="">Villa Seçin</option>';
    villas.forEach(villa => {
        const option = document.createElement('option');
        option.value = villa.isim;
        option.textContent = `${villa.isim} (${villa.kategori})`;
        villaSelect.appendChild(option);
    });
}

function updateAssignments() {
    const assignmentsDiv = document.getElementById('assignments');
    assignmentsDiv.innerHTML = '';

    if (assignments.length === 0) {
        assignmentsDiv.innerHTML = '<p class="no-data">Henüz atama yapılmamış</p>';
        return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = statusFilter.value;
    const today = new Date();

    let filteredAssignments = assignments.filter(assignment => {
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate);
        const matchesSearch = 
            assignment.lea.toLowerCase().includes(searchTerm) || 
            (assignment.secondaryLea && assignment.secondaryLea.toLowerCase().includes(searchTerm)) ||
            assignment.villa.toLowerCase().includes(searchTerm);

        if (!matchesSearch) return false;

        switch (filterValue) {
            case 'aktif':
                return start <= today && end >= today;
            case 'gelecek':
                return start > today;
            case 'geçmiş':
                return end < today;
            default:
                return true;
        }
    });

    filteredAssignments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    filteredAssignments.forEach(assignment => {
        const lea = leas.find(l => l.isim === assignment.lea);
        const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
        const villa = villas.find(v => v.isim === assignment.villa);
        
        const card = document.createElement('div');
        card.className = 'assignment-card';
        
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate);
        const today = new Date();
        
        let status = start > today ? 'gelecek' : 
                    end < today ? 'geçmiş' : 'aktif';
        
        card.classList.add(status);
        
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        let leasHtml = `<p><i class="fas fa-user"></i> ${lea?.isim || assignment.lea}</p>`;
        
        // İkinci LEA varsa göster
        if (assignment.secondaryLea) {
            leasHtml += `<p><i class="fas fa-user-plus"></i> ${secondaryLea?.isim || assignment.secondaryLea}</p>`;
        }
        
        card.innerHTML = `
            <div class="assignment-header">
                <h3>${villa?.isim || assignment.villa}</h3>
                <span class="status-badge">${status}</span>
            </div>
            <div class="assignment-details">
                ${leasHtml}
                <p><i class="fas fa-calendar-alt"></i> ${formatDate(assignment.startDate)} - ${formatDate(assignment.endDate)}</p>
                <p><i class="fas fa-moon"></i> ${nights} gece</p>
            </div>
            <div class="assignment-actions">
                <button class="action-btn edit-btn" onclick="editAssignment('${assignment.id}')" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteAssignment('${assignment.id}')" title="Sil">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        assignmentsDiv.appendChild(card);
    });

    if (filteredAssignments.length === 0) {
        assignmentsDiv.innerHTML = '<p class="no-data">Arama kriterlerine uygun atama bulunamadı</p>';
    }
}

// LEA İstatistiklerini Güncelleme
function updateLeaStats() {
    // LEA'ların benzersiz listesini oluşturma
    const leaStats = {};
    
    // Önce tüm LEA'ları listeye ekleyelim (atama olsun olmasın)
    // Bu şekilde tüm LEA'lar gösterilecek, sadece atama yapılmış olanlar değil
    leas.forEach(lea => {
        leaStats[lea.isim] = {
            name: lea.isim,
            activeVillas: [],
            activeVillaCount: 0
        };
    });
    
    // Bugünün tarihini al ve karşılaştırmak için formatla
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Aktif atamaları belirle (dashboard ile uyumlu olarak)
    const activeAssignments = assignments.filter(assignment => {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        // Check-in ve check-out saati kontrolü için şu anki saat
        const currentHour = new Date().getHours();
        
        // 1. Başlangıç tarihi bugünden önce ve bitiş tarihi bugün veya sonrasında
        // 2. VEYA başlangıç tarihi bugün (check-in bugün)
        // 3. VEYA bitiş tarihi bugün ve saat henüz check-out saatinden önce (12:00)
        return (startDate < today && endDate >= today) || 
               (startDate.getTime() === today.getTime()) ||
               (endDate.getTime() === today.getTime() && currentHour < 12);
    });
    
    // Debug log - aktif atama sayısını kontrol et
    console.log("Toplam aktif atama sayısı:", activeAssignments.length);
    
    // Aktif villaları hesapla (her LEA için)
    activeAssignments.forEach(assignment => {
        // Ana LEA için villa ekle
        const mainLea = assignment.lea;
        
        // Emin olmak için kontrol - null kontrolleri önemli
        if (mainLea && leaStats[mainLea]) {
            // Her villa kodu, villaCode veya villa olarak kaydedilmiş olabilir
            const villaCode = assignment.villaCode || assignment.villa;
            
            // Her villanın sadece bir kez sayılmasını sağla
            if (villaCode && !leaStats[mainLea].activeVillas.includes(villaCode)) {
                leaStats[mainLea].activeVillas.push(villaCode);
                leaStats[mainLea].activeVillaCount++;
                
                // Debug log - hangi LEA'ya hangi villa eklendi
                console.log(`Ana LEA ${mainLea} için villa eklendi: ${villaCode}`);
            }
        }
        
        // İkincil LEA varsa ona da villa ekle
        if (assignment.secondaryLea && assignment.secondaryLea.trim() !== "") {
            const secondaryLea = assignment.secondaryLea;
            
            // Emin olmak için kontrol
            if (secondaryLea && leaStats[secondaryLea]) {
                // Her villa kodu, villaCode veya villa olarak kaydedilmiş olabilir
                const villaCode = assignment.villaCode || assignment.villa;
                
                // Her villanın sadece bir kez sayılmasını sağla
                if (villaCode && !leaStats[secondaryLea].activeVillas.includes(villaCode)) {
                    leaStats[secondaryLea].activeVillas.push(villaCode);
                    leaStats[secondaryLea].activeVillaCount++;
                    
                    // Debug log - hangi LEA'ya hangi villa eklendi
                    console.log(`İkincil LEA ${secondaryLea} için villa eklendi: ${villaCode}`);
                }
            }
        }
    });
    
    // LEA kartlarını sırala ve oluştur
    const leaCardsContainer = document.getElementById("leaCardsContainer");
    leaCardsContainer.innerHTML = "";
    
    // Sıralama için kullanılacak değeri belirle
    const sortSelect = document.getElementById("leaSortSelect");
    const sortBy = sortSelect.value;
    
    // Arama değerini al
    const searchInput = document.getElementById("leaSearchInput").value.toLowerCase();
    
    // LEA'ları sırala ve filtrele
    const sortedLeas = Object.values(leaStats)
        .filter(stat => stat.name.toLowerCase().includes(searchInput))
        .sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "activeVillaCount":
                    return b.activeVillaCount - a.activeVillaCount;
                default:
                    return 0;
            }
        });
    
    // Debug log - kaç LEA kartı oluşturulacak
    console.log(`Toplam ${sortedLeas.length} LEA kartı oluşturuluyor`);
    
    // LEA kartlarını oluştur
    sortedLeas.forEach(stat => {
        // LEA kartını oluştur
        const leaCard = document.createElement("div");
        leaCard.className = "lea-card";
        
        leaCard.innerHTML = `
            <div class="lea-name">
                <i class="fas fa-user"></i> ${stat.name}
            </div>
            <div class="active-villa-count">
                <i class="fas fa-home"></i> ${stat.activeVillaCount}
            </div>
        `;
        
        leaCardsContainer.appendChild(leaCard);
    });
}

// Modal kontrolleri
document.addEventListener("DOMContentLoaded", function() {
    const leaStatsBtn = document.getElementById("openLeaStatsBtn");
    const leaStatsModal = document.getElementById("leaStatsModal");
    const closeLeaStatsBtn = document.getElementById("closeLeaStatsBtn");
    const leaSortSelect = document.getElementById("leaSortSelect");
    const leaSearchInput = document.getElementById("leaSearchInput");
    
    // Veri kaydetme ve yükleme butonları
    const saveLeaDataBtn = document.getElementById("saveLeaDataBtn");
    const loadLeaDataBtn = document.getElementById("loadLeaDataBtn");
    const leaDataFileInput = document.getElementById("leaDataFileInput");
    const refreshSystemBtn = document.getElementById("refreshSystemBtn");
    const uploadToFirebaseBtn = document.getElementById("uploadToFirebaseBtn");
    
    // LEA İstatistikleri Butonuna Tıklama
    leaStatsBtn.addEventListener("click", function() {
        updateLeaStats();
        leaStatsModal.style.display = "block";
    });
    
    // Modalı Kapatma Butonu
    closeLeaStatsBtn.addEventListener("click", function() {
        leaStatsModal.style.display = "none";
    });
    
    // Modalın dışına tıklama ile kapanması
    window.addEventListener("click", function(event) {
        if (event.target === leaStatsModal) {
            leaStatsModal.style.display = "none";
        }
    });
    
    // Sıralama değiştiğinde LEA istatistiklerini güncelle
    leaSortSelect.addEventListener("change", updateLeaStats);
    
    // Arama yapıldığında LEA istatistiklerini güncelle
    leaSearchInput.addEventListener("input", updateLeaStats);
    
    // Verileri Kaydet Butonu
    saveLeaDataBtn.addEventListener("click", function() {
        saveLeaData();
    });
    
    // Verileri Yükle Butonu
    loadLeaDataBtn.addEventListener("click", function() {
        leaDataFileInput.click();
    });
    
    // Sistem Verilerini Yenile Butonu
    refreshSystemBtn.addEventListener("click", function() {
        refreshSystemData();
    });
    
    // Firebase'e Veri Yükleme Butonu
    uploadToFirebaseBtn.addEventListener("click", function() {
        uploadDataToFirebase();
    });
    
    // Dosya seçildiğinde
    leaDataFileInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (file) {
            loadLeaData(file);
        }
    });
});

// LEA verilerini kaydetme fonksiyonu
function saveLeaData() {
    // Kaydedilecek veriler: atamalar, LEA'lar ve villalar
    const data = {
        assignments: assignments,
        leas: leas,
        villas: villas
    };
    
    // Veriyi JSON formatına dönüştür
    const jsonData = JSON.stringify(data, null, 2);
    
    // Dosya adını oluştur (tarih-saat içeren)
    const date = new Date();
    const fileName = `lea_data_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}.json`;
    
    // Dosyayı indir
    const blob = new Blob([jsonData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Kullanıcıya bilgi ver
    Swal.fire({
        title: 'Başarılı!',
        text: 'Veriler başarıyla kaydedildi.',
        icon: 'success',
        confirmButtonText: 'Tamam'
    });
}

// LEA verilerini yükleme fonksiyonu
function loadLeaData(file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            // JSON verisini parse et
            const data = JSON.parse(event.target.result);
            
            // Verileri kontrol et
            if (!data.assignments || !data.leas || !data.villas) {
                throw new Error('Geçersiz veri formatı');
            }
            
            // Onay iste
            Swal.fire({
                title: 'Emin misiniz?',
                text: 'Mevcut veriler yüklenecek verilerle değiştirilecek. Bu işlem geri alınamaz!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Evet, Yükle',
                cancelButtonText: 'İptal',
                confirmButtonColor: '#4caf50',
                cancelButtonColor: '#f44336'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Verileri güncelle
                    assignments = data.assignments;
                    leas = data.leas;
                    villas = data.villas;
                    
                    // LocalStorage'a kaydet
                    saveToLocalStorage();
                    
                    // UI'ı güncelle
                    updateUI();
                    updateQuickStats();
                    updateLeaStats();
                    updateDailyBrief();
                    
                    // Kullanıcıya bilgi ver
                    Swal.fire({
                        title: 'Başarılı!',
                        text: 'Veriler başarıyla yüklendi.',
                        icon: 'success',
                        confirmButtonText: 'Tamam'
                    });
                }
            });
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            
            // Hata mesajı göster
            Swal.fire({
                title: 'Hata!',
                text: 'Dosya yüklenirken bir hata oluştu. Lütfen geçerli bir veri dosyası seçin.',
                icon: 'error',
                confirmButtonText: 'Tamam'
            });
        }
    };
    
    // Dosyayı oku
    reader.readAsText(file);
}

// UI güncellemesi - İstatistik kartları için
function updateQuickStats() {
    document.getElementById('totalLeas').textContent = leas.length;
    document.getElementById('totalVillas').textContent = villas.length;
    
    // Bugünün tarihi
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Aktif atamaları sayma
    const activeCount = assignments.filter(assignment => {
        const startDate = new Date(assignment.startDate);
        const endDate = new Date(assignment.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        return startDate <= today && endDate >= today;
    }).length;
    
    document.getElementById('activeAssignments').textContent = activeCount;
    
    // Atama sayısı değiştiğinde LEA istatistiklerini de güncelle
    if (document.getElementById('leaStatsModal').style.display === 'block') {
        updateLeaStats();
    }
}

// Sayfa yüklendiğinde JSON verileri yükle ve tarihleri ayarla
document.addEventListener('DOMContentLoaded', () => {
    // JSON verilerini yükle ve yüklendikten sonra diğer fonksiyonları çağır
    loadJSONData().then(() => {
        setDefaultDates();
        setupReportSystem();
        setupDailyBrief(); // Daily Brief sistemini kur (veri yüklendikten sonra)
        // LEA istatistikleri için olaylar zaten modal kontrolleri içinde ayarlandı
        
        // İlk yükleme için görsel elemanları güncelle
        updateUI();
        updateQuickStats();
    }).catch(error => {
        console.error("Veri yükleme hatası:", error);
        Swal.fire({
            title: 'Hata',
            text: 'Veri yüklenirken bir hata oluştu!',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    });
});

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'short' };
    return new Date(dateStr).toLocaleDateString('tr-TR', options);
}

// Bugünün tarihini varsayılan olarak ayarla
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    startDateInput.valueAsDate = today;
    endDateInput.valueAsDate = tomorrow;
}

// İptal butonu ile düzenleme modundan çıkma
function cancelEdit() {
    editingAssignment = null;
    document.querySelector('.assign-btn').innerHTML = '<i class="fas fa-plus"></i> Atama Yap';
    cancelEditBtn.style.display = 'none';
    document.querySelector('.quick-assign').classList.remove('editing');
    assignmentForm.reset();
    setDefaultDates();
}

// İptal butonuna event listener
cancelEditBtn.addEventListener('click', cancelEdit);

// Rapor Sistemi
function setupReportSystem() {
    const modal = document.getElementById('reportModal');
    const reportBtn = document.getElementById('generateReportBtn');
    const closeBtn = document.querySelector('.close-modal');
    const previewBtn = document.getElementById('previewReportBtn');
    const downloadBtn = document.getElementById('downloadReportBtn');
    
    // Rapor tarihlerini varsayılan olarak ayarla
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');
    
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    reportStartDate.valueAsDate = monthAgo;
    reportEndDate.valueAsDate = today;
    
    // Modal açma-kapama
    reportBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        previewReport();
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Rapor türü değiştiğinde önizleme güncelle
    document.getElementById('reportType').addEventListener('change', previewReport);
    document.getElementById('reportStatusFilter').addEventListener('change', previewReport);
    reportStartDate.addEventListener('change', previewReport);
    reportEndDate.addEventListener('change', previewReport);
    
    // Rapor önizleme
    previewBtn.addEventListener('click', previewReport);
    
    // PDF indirme
    downloadBtn.addEventListener('click', downloadReport);
}

// Rapor önizleme fonksiyonu
function previewReport() {
    const reportType = document.getElementById('reportType').value;
    const statusFilter = document.getElementById('reportStatusFilter').value;
    const startDate = new Date(document.getElementById('reportStartDate').value);
    const endDate = new Date(document.getElementById('reportEndDate').value);
    
    const previewDiv = document.getElementById('reportPreview');
    
    // Tarih kontrolü
    if (startDate > endDate) {
        previewDiv.innerHTML = '<p class="error-text">Başlangıç tarihi bitiş tarihinden sonra olamaz!</p>';
        return;
    }
    
    let reportHTML = '';
    
    // Rapor başlığı
    const reportTitle = reportType === 'assignments' ? 'Atama Raporu' : 
                        reportType === 'leas' ? 'LEA Raporu' : 
                        reportType === 'villas' ? 'Villa Raporu' : 'Günlük Brief Raporu';
    
    reportHTML += `
        <div class="report-content">
            <div class="report-header">
                <h2>${reportTitle}</h2>
                <p>Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
                <p>Tarih Aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}</p>
            </div>
    `;
    
    // Rapor içeriği
    if (reportType === 'assignments') {
        reportHTML += generateAssignmentsReport(statusFilter, startDate, endDate);
    } else if (reportType === 'leas') {
        reportHTML += generateLeasReport(statusFilter, startDate, endDate);
    } else if (reportType === 'villas') {
        reportHTML += generateVillasReport(statusFilter, startDate, endDate);
    } else if (reportType === 'dailyBrief') {
        reportHTML = generateDailyBriefReport(statusFilter, startDate, endDate);
    }
    
    reportHTML += '</div>';
    previewDiv.innerHTML = reportHTML;
}

// Atama raporu oluştur
function generateAssignmentsReport(statusFilter, startDate, endDate) {
    let filteredAssignments = assignments.filter(assignment => {
        const assignStart = new Date(assignment.startDate);
        const assignEnd = new Date(assignment.endDate);
        
        // Tarih aralığıyla kesişen atamalar
        const dateOverlap = assignStart <= endDate && assignEnd >= startDate;
        
        if (!dateOverlap) return false;
        
        // Durum filtresi
        if (statusFilter !== 'all') {
            const today = new Date();
            const status = assignStart > today ? 'gelecek' : 
                         assignEnd < today ? 'geçmiş' : 'aktif';
            
            if (status !== statusFilter) return false;
        }
        
        return true;
    });
    
    // Başlangıç tarihine göre sırala
    filteredAssignments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    if (filteredAssignments.length === 0) {
        return '<p class="no-data">Seçilen kriterlere uygun atama bulunamadı.</p>';
    }
    
    let html = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>Villa</th>
                    <th>Ana LEA</th>
                    <th>İkinci LEA</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Süre</th>
                    <th>Durum</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const today = new Date();
    
    filteredAssignments.forEach(assignment => {
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        let status = start > today ? 'gelecek' : 
                    end < today ? 'geçmiş' : 'aktif';
        
        html += `
            <tr class="${status}">
                <td>${assignment.villa}</td>
                <td>${assignment.lea}</td>
                <td>${assignment.secondaryLea || '-'}</td>
                <td>${start.toLocaleDateString('tr-TR')}</td>
                <td>${end.toLocaleDateString('tr-TR')}</td>
                <td>${nights} gece</td>
                <td><span class="status-pill ${status}">${status}</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="report-summary">
            <p><strong>Toplam Atama:</strong> ${filteredAssignments.length}</p>
        </div>
    `;
    
    return html;
}

// LEA raporu oluştur
function generateLeasReport(statusFilter, startDate, endDate) {
    // Tarih aralığına göre atamaları filtrele
    const filteredAssignments = assignments.filter(assignment => {
        const assignStart = new Date(assignment.startDate);
        const assignEnd = new Date(assignment.endDate);
        
        // Tarih aralığıyla kesişen atamalar
        const dateOverlap = assignStart <= endDate && assignEnd >= startDate;
        
        if (!dateOverlap) return false;
        
        // Durum filtresi
        if (statusFilter !== 'all') {
            const today = new Date();
            const status = assignStart > today ? 'gelecek' : 
                         assignEnd < today ? 'geçmiş' : 'aktif';
            
            if (status !== statusFilter) return false;
        }
        
        return true;
    });
    
    if (leas.length === 0) {
        return '<p class="no-data">Sistemde LEA bilgisi bulunamadı.</p>';
    }
    
    if (filteredAssignments.length === 0) {
        return '<p class="no-data">Seçilen tarih aralığında atama bulunamadı.</p>';
    }
    
    const today = new Date();
    let html = '';
    
    // Özet bilgi
    html += `
        <div class="report-compact-header">
            <div class="compact-summary">
                <span>Toplam LEA: <strong>${leas.length}</strong></span>
                <span>Toplam Atama: <strong>${filteredAssignments.length}</strong></span>
                <span>Tarih: <strong>${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}</strong></span>
            </div>
        </div>
    `;
    
    // Kompakt liste
    html += `<div class="compact-lea-list">`;
    
    // LEA'ları alfabetik sırala
    const sortedLeas = [...leas].sort((a, b) => a.isim.localeCompare(b.isim));
    
    // Her LEA için
    sortedLeas.forEach(lea => {
        // Ana LEA olarak atanmış atamalar
        const primaryAssignments = filteredAssignments.filter(a => a.lea === lea.isim);
        // İkinci LEA olarak atanmış atamalar
        const secondaryAssignments = filteredAssignments.filter(a => a.secondaryLea === lea.isim);
        
        // Eğer hiç atama yoksa, bu LEA'yı raporda gösterme
        if (primaryAssignments.length === 0 && secondaryAssignments.length === 0) {
            return;
        }
        
        // Aktif atamaları bul
        const activeAssignments = [...primaryAssignments, ...secondaryAssignments].filter(a => {
            const start = new Date(a.startDate);
            const end = new Date(a.endDate);
            return start <= today && end >= today;
        });
        
        // Tüm atamaları tarih sırasına göre sırala
        const allAssignments = [...primaryAssignments, ...secondaryAssignments].sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );
        
        html += `
            <div class="compact-lea-item">
                <div class="compact-lea-header">
                    <h4>${lea.isim} (${lea.kategori})</h4>
                    <span class="compact-stats">
                        <span class="compact-badge aktif">${activeAssignments.length} Aktif</span>
                        <span class="compact-badge total">${allAssignments.length} Toplam</span>
                    </span>
                </div>
        `;
        
        // Atamalar varsa
        if (allAssignments.length > 0) {
            html += `<table class="compact-table">
                <thead>
                    <tr>
                        <th>Villa</th>
                        <th>Rol</th>
                        <th>Tarih</th>
                        <th>Durum</th>
                    </tr>
                </thead>
                <tbody>`;
            
            // Her atama için tek satır
            allAssignments.forEach(assignment => {
                const start = new Date(assignment.startDate);
                const end = new Date(assignment.endDate);
                const role = assignment.lea === lea.isim ? 'Ana LEA' : 'İkinci LEA';
                const status = start > today ? 'gelecek' : end < today ? 'geçmiş' : 'aktif';
                
                const villa = villas.find(v => v.isim === assignment.villa);
                const villaName = villa ? villa.isim : assignment.villa;
                
                html += `
                    <tr class="${status}">
                        <td>${villaName}</td>
                        <td>${role}</td>
                        <td>${formatDate(assignment.startDate)} - ${formatDate(assignment.endDate)}</td>
                        <td><span class="compact-status ${status}">${status}</span></td>
                    </tr>
                `;
            });
            
            html += `</tbody></table>`;
        } else {
            html += `<p class="no-assignments">Bu LEA için atama bulunmuyor.</p>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    
    return html;
}

// Villa raporu oluştur
function generateVillasReport(statusFilter, startDate, endDate) {
    // Tarih aralığına göre atamaları filtrele
    const filteredAssignments = assignments.filter(assignment => {
        const assignStart = new Date(assignment.startDate);
        const assignEnd = new Date(assignment.endDate);
        
        // Tarih aralığıyla kesişen atamalar
        const dateOverlap = assignStart <= endDate && assignEnd >= startDate;
        
        if (!dateOverlap) return false;
        
        // Durum filtresi
        if (statusFilter !== 'all') {
            const today = new Date();
            const status = assignStart > today ? 'gelecek' : 
                         assignEnd < today ? 'geçmiş' : 'aktif';
            
            if (status !== statusFilter) return false;
        }
        
        return true;
    });
    
    if (villas.length === 0) {
        return '<p class="no-data">Sistemde villa bilgisi bulunamadı.</p>';
    }
    
    const today = new Date();
    let html = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>Villa</th>
                    <th>Kategori</th>
                    <th>Tip</th>
                    <th>Aktif Atama</th>
                    <th>Toplam Atamalar</th>
                    <th>Doluluk (Gün)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    villas.forEach(villa => {
        const villaAssignments = filteredAssignments.filter(a => a.villa === villa.isim);
        
        // Aktif atama kontrolü
        const activeAssignment = villaAssignments.find(a => {
            const start = new Date(a.startDate);
            const end = new Date(a.endDate);
            return start <= today && end >= today;
        });
        
        // Toplam doluluk günü hesapla
        let totalDays = 0;
        villaAssignments.forEach(a => {
            const start = new Date(a.startDate);
            const end = new Date(a.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            totalDays += days;
        });
        
        html += `
            <tr>
                <td>${villa.isim}</td>
                <td>${villa.kategori}</td>
                <td>${villa.tip}</td>
                <td>${activeAssignment ? activeAssignment.lea : '-'}</td>
                <td>${villaAssignments.length}</td>
                <td>${totalDays}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

// PDF indirme fonksiyonu
function downloadReport() {
    const reportType = document.getElementById('reportType').value;
    const statusFilter = document.getElementById('reportStatusFilter').value;
    
    // Rapor başlığı
    const reportTitle = reportType === 'assignments' ? 'Atama Raporu' : 
                     reportType === 'leas' ? 'LEA Raporu' : 'Villa Raporu';
    
    // Dosya adı oluştur
    const fileName = `${reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // PDF seçenekleri
    const opt = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: reportType === 'leas' ? 'portrait' : 'landscape' }
    };
    
    // Rapor içeriğini al
    const content = document.querySelector('.report-content');
    
    if (!content) {
        Swal.fire({
            title: 'Hata',
            text: 'Rapor içeriği oluşturulamadı!',
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
        return;
    }
    
    // PDF oluştur
    Swal.fire({
        title: 'PDF Hazırlanıyor',
        text: 'Lütfen bekleyin...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            
            // Özel CSS ekle
            const style = document.createElement('style');
            style.innerHTML = `
                .report-content {
                    font-family: 'Arial', sans-serif;
                    color: #333;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .report-table th, .report-table td {
                    border: 1px solid #ddd;
                    padding: 6px;
                    text-align: left;
                }
                .report-table th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                
                /* Kompakt LEA Raporu PDF Stilleri */
                .compact-summary {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding: 8px;
                    border: 1px solid #ddd;
                    background-color: #f9f9f9;
                }
                
                .compact-lea-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .compact-lea-item {
                    margin-bottom: 15px;
                    border: 1px solid #ddd;
                    break-inside: avoid;
                }
                
                .compact-lea-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    background-color: #e3f2fd;
                    border-bottom: 1px solid #1565c0;
                }
                
                .compact-lea-header h4 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: bold;
                    color: #1565c0;
                }
                
                .compact-stats {
                    display: flex;
                    gap: 10px;
                }
                
                .compact-badge {
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 10px;
                }
                
                .compact-badge.aktif {
                    background-color: #2e7d32;
                    color: white;
                }
                
                .compact-badge.total {
                    background-color: #546e7a;
                    color: white;
                }
                
                .compact-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                
                .compact-table th {
                    background-color: #f5f5f5;
                    padding: 5px;
                    text-align: left;
                    font-weight: bold;
                    border-bottom: 1px solid #ddd;
                }
                
                .compact-table td {
                    padding: 5px;
                    border-bottom: 1px solid #eee;
                }
                
                .compact-status {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 9px;
                    text-transform: uppercase;
                    color: white;
                }
                
                .compact-status.aktif { background-color: #2e7d32; }
                .compact-status.gelecek { background-color: #f57f17; }
                .compact-status.geçmiş { background-color: #757575; }
                
                .no-assignments {
                    padding: 10px;
                    text-align: center;
                    font-style: italic;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
            
            // PDF oluştur
            html2pdf().from(content).set(opt).save()
            .then(() => {
                document.head.removeChild(style);
                Swal.fire({
                    title: 'Başarılı',
                    text: 'PDF raporu indirildi!',
                    icon: 'success',
                    confirmButtonText: 'Tamam'
                });
            }).catch(err => {
                console.error('PDF hatası:', err);
                Swal.fire({
                    title: 'Hata',
                    text: 'PDF oluşturulurken bir hata oluştu!',
                    icon: 'error',
                    confirmButtonText: 'Tamam'
                });
            });
        }
    });
}

// Daily Brief için gerekli fonksiyonlar
function setupDailyBrief() {
    try {
        // Villa verileri ve atama verileri hazır olduğundan emin ol
        if (villas.length === 0) {
            console.warn("Villa verileri yüklenemedi, brief güncellenemedi!");
            return;
        }
        
        // Günlük Brief tarihini ayarla
        updateBriefDate();
        console.log("Debug: Brief tarihi güncellendi");
        
        // DOM elemanlarını kontrol et
        const detailBtns = document.querySelectorAll('.brief-detail-btn');
        if (detailBtns.length === 0) {
            console.warn("Brief detay butonları bulunamadı! DOM henüz hazır olmayabilir.");
            // Hata fırlatma yerine fonksiyonu sonlandır
            return;
        }
        
        // Detayları görüntüleme/gizleme
        detailBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const detailsElement = document.getElementById(targetId);
                
                if (!detailsElement) {
                    console.warn(`Hedef element bulunamadı: #${targetId}`);
                    return;
                }
                
                // Tüm detay panellerini kapat
                document.querySelectorAll('.brief-details').forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // Hedef paneli aç
                detailsElement.classList.add('active');
            });
        });
        console.log("Debug: Detay butonları ayarlandı");
        
        // Detay panellerini kapatma
        const closeBtns = document.querySelectorAll('.close-details-btn');
        if (closeBtns.length === 0) {
            console.warn("Brief kapat butonları bulunamadı!");
        } else {
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const panel = btn.closest('.brief-details');
                    if (panel) {
                        panel.classList.remove('active');
                    }
                });
            });
            console.log("Debug: Kapat butonları ayarlandı");
        }
        
        // Yazdır butonu
        const printBtn = document.getElementById('printBriefBtn');
        if (!printBtn) {
            console.warn("Brief yazdır butonu bulunamadı!");
        } else {
            printBtn.addEventListener('click', printDailyBrief);
            console.log("Debug: Yazdır butonu ayarlandı");
        }
        
        // Brief verilerini yükle
        updateDailyBrief();
        console.log("Brief verileri güncellendi: Toplam villa sayısı", villas.length);
        
        // Otomatik güncelleme için zamanlayıcıyı başlat
        // Her 30 dakikada bir ve gün değişimlerinde güncelleme yapar
        startBriefAutoUpdate();
        console.log("Debug: Brief otomatik güncelleme başlatıldı");
        
    } catch (error) {
        console.error("setupDailyBrief hatası:", error);
        console.error("Hata yeri:", error.stack);
    }
}

// Otomatik güncelleme zamanlayıcısını başlat
let briefUpdateInterval = null; // Global değişken

function startBriefAutoUpdate() {
    try {
        // Mevcut zamanlayıcıyı temizle
        if (briefUpdateInterval) {
            clearInterval(briefUpdateInterval);
            briefUpdateInterval = null;
        }
        
        // Her 30 dakikada bir güncelle
        briefUpdateInterval = setInterval(() => {
            try {
                updateDailyBrief();
                console.log("Brief otomatik olarak güncellendi - 30dk");
            } catch (err) {
                console.error("Otomatik brief güncelleme hatası:", err);
            }
        }, 30 * 60 * 1000); // 30 dakika
        
        // Gün değişiminde güncelle (gece yarısı)
        const now = new Date();
        const night = new Date();
        night.setHours(24, 0, 0, 0); // Gece yarısı
        
        // Şu an ile gece yarısı arasındaki fark (milisaniye cinsinden)
        const msToMidnight = night.getTime() - now.getTime();
        
        // Gece yarısında bir kez çalışacak zamanlayıcı
        setTimeout(() => {
            try {
                updateBriefDate(); // Tarihi güncelle
                updateDailyBrief(); // Brief verilerini güncelle
                console.log("Gün değişiminde brief güncellendi");
                
                // Sonraki günler için her gece yarısı otomatik güncelleme
                setInterval(() => {
                    try {
                        updateBriefDate();
                        updateDailyBrief();
                        console.log("Yeni gün için brief güncellendi");
                    } catch (err) {
                        console.error("Günlük brief güncelleme hatası:", err);
                    }
                }, 24 * 60 * 60 * 1000); // 24 saat
            } catch (err) {
                console.error("Gece yarısı brief güncelleme hatası:", err);
            }
        }, msToMidnight);
        
        // Günlük otomatik güncelleme durumunu konsola bildir
        console.log("Daily Brief otomatik güncelleme başlatıldı, 30 dakikada bir güncellenecek.");
    } catch (error) {
        console.error("startBriefAutoUpdate hatası:", error);
    }
}

// Brief tarihini güncelle
function updateBriefDate() {
    try {
        const dateElement = document.getElementById('briefDate');
        if (!dateElement) {
            console.warn("Brief tarih elementi bulunamadı!");
            return;
        }

        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('tr-TR', options);
        console.log("Brief tarihi güncellendi");
    } catch (error) {
        console.error("updateBriefDate hatası:", error);
    }
}

// Günlük Brief verilerini güncelle
function updateDailyBrief() {
    try {
        // Bugünün başlangıcı ve bitişi
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Bugün gelenler
        const arrivingToday = assignments.filter(assignment => {
            const startDate = new Date(assignment.startDate);
            startDate.setHours(0, 0, 0, 0);
            return startDate.getTime() === today.getTime();
        });
        
        // Bugün ayrılanlar
        const departingToday = assignments.filter(assignment => {
            const endDate = new Date(assignment.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate.getTime() === today.getTime();
        });
        
        // Dolu villalar (aktif atamalar)
        // Not: Bugün giriş yapacak villalar aktif, bugün çıkış yapacak villalar pasif durumda
        const activeAssignments = assignments.filter(assignment => {
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            
            // Bugün giriş yapıyorsa aktif
            if (startDate.getTime() === today.getTime()) {
                return true;
            }
            
            // Bugün çıkış yapıyorsa, şu anki saate göre değerlendir
            if (endDate.getTime() === today.getTime()) {
                // Çıkış saati kontrolü (genellikle öğlen 12:00)
                const checkoutHour = 12; // Varsayılan çıkış saati 12:00
                const currentHour = new Date().getHours();
                
                // Eğer şu anki saat çıkış saatinden küçükse, hala aktif say
                return currentHour < checkoutHour;
            }
            
            // Normal aktiflik kontrolü (giriş tarihi geçmiş, çıkış tarihi gelmemiş)
            return startDate < today && endDate > today;
        });
        
        // Doluluk oranı
        const occupancyRate = calculateOccupancyRate(activeAssignments);
        
        // Sayaçları güncelle - DOM elementlerinin varlığını kontrol et
        const elements = [
            { id: 'arrivalsCount', value: arrivingToday.length },
            { id: 'departuresCount', value: departingToday.length },
            { id: 'occupancyRate', value: `${occupancyRate}%` },
            { id: 'occupiedVillas', value: activeAssignments.length },
            { id: 'totalAvailableVillas', value: villas.length }
        ];
        
        elements.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                element.textContent = item.value;
            } else {
                console.warn(`Element bulunamadı: #${item.id}`);
            }
        });
        
        // Detay tablolarını güncelle
        updateArrivalsTable(arrivingToday);
        updateDeparturesTable(departingToday);
        updateOccupancyDetails(activeAssignments, occupancyRate);
        
        console.log("Daily Brief verileri güncellendi");
    } catch (error) {
        console.error("updateDailyBrief hatası:", error);
    }
}

// Gelenler tablosunu güncelle
function updateArrivalsTable(arrivingAssignments) {
    try {
        const tableBody = document.querySelector('#arrivalsTable tbody');
        if (!tableBody) {
            console.warn("Arrivals table tbody elementi bulunamadı!");
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (arrivingAssignments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Bugün gelen misafir bulunmuyor.</td></tr>';
            return;
        }
        
        // Başlangıç saatine göre sırala (sabahtan akşama)
        arrivingAssignments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        arrivingAssignments.forEach(assignment => {
            const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
            
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            // Varsayılan giriş saati 14:00 olarak kabul edildi (isterseniz değiştirilebilir)
            const checkInTime = '14:00';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${villa.isim}</td>
                <td>${villa.kategori}</td>
                <td>
                    ${lea.isim}
                    ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                </td>
                <td>${checkInTime}</td>
                <td>${nights} gece</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        console.log(`Gelenler tablosu güncellendi: ${arrivingAssignments.length} gelen misafir`);
    } catch (error) {
        console.error("updateArrivalsTable hatası:", error);
    }
}

// Ayrılanlar tablosunu güncelle
function updateDeparturesTable(departingAssignments) {
    try {
        const tableBody = document.querySelector('#departuresTable tbody');
        if (!tableBody) {
            console.warn("Departures table tbody elementi bulunamadı!");
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (departingAssignments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Bugün ayrılan misafir bulunmuyor.</td></tr>';
            return;
        }
        
        // Çıkış saatine göre sırala (sabahtan akşama)
        departingAssignments.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        
        departingAssignments.forEach(assignment => {
            const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
            
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            // Varsayılan çıkış saati 12:00 olarak kabul edildi (isterseniz değiştirilebilir)
            const checkOutTime = '12:00';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${villa.isim}</td>
                <td>${villa.kategori}</td>
                <td>
                    ${lea.isim}
                    ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                </td>
                <td>${checkOutTime}</td>
                <td>${nights} gece</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        console.log(`Ayrılanlar tablosu güncellendi: ${departingAssignments.length} ayrılan misafir`);
    } catch (error) {
        console.error("updateDeparturesTable hatası:", error);
    }
}

// Doluluk detaylarını güncelle
function updateOccupancyDetails(activeAssignments, generalOccupancy) {
    try {
        // Doluluk metriklerini güncelle
        const generalOccupancyElement = document.getElementById('generalOccupancy');
        if (generalOccupancyElement) {
            generalOccupancyElement.textContent = `${generalOccupancy}%`;
        }
        
        // Villa tiplerine göre doluluk hesapla
        const villaTypes = Object.values(VILLA_TYPES);
        
        villaTypes.forEach(type => {
            const villasByType = villas.filter(v => v.tip === type);
            const occupiedVillasByType = [];
            
            // Her tip için dolu villaları bul
            activeAssignments.forEach(assignment => {
                const villa = villas.find(v => v.isim === assignment.villa);
                if (villa && villa.tip === type && !occupiedVillasByType.includes(villa.isim)) {
                    occupiedVillasByType.push(villa.isim);
                }
            });
            
            const occupancyByType = villasByType.length > 0 ? 
                Math.round((occupiedVillasByType.length / villasByType.length) * 100) : 0;
            
            const elementId = `${type.toLowerCase()}Occupancy`;
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = `${occupancyByType}%`;
            } else {
                console.warn(`Element bulunamadı: #${elementId}`);
            }
        });
        
        // Doluluk tablosunu güncelle
        const tableBody = document.querySelector('#occupancyTable tbody');
        if (!tableBody) {
            console.warn("Occupancy table tbody elementi bulunamadı!");
            return;
        }
        
        tableBody.innerHTML = '';
        
        // Bugünün tarihi
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Çıkış saati (genellikle 12:00)
        const checkoutHour = 12;
        const currentHour = new Date().getHours();
        
        // Tüm villaları göster, dolu veya boş
        const allVillas = [...villas];
        
        // Villaları kategorilerine göre sırala
        allVillas.sort((a, b) => {
            if (a.kategori === b.kategori) {
                return a.isim.localeCompare(b.isim);
            }
            return a.kategori.localeCompare(b.kategori);
        });
        
        allVillas.forEach(villa => {
            // Bu villa için atama bul
            const assignment = activeAssignments.find(a => a.villa === villa.isim);
            
            const row = document.createElement('tr');
            row.className = assignment ? 'occupied' : 'available';
            
            if (assignment) {
                const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
                const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
                
                const startDate = new Date(assignment.startDate);
                const endDate = new Date(assignment.endDate);
                
                // Bugün giriş mi, çıkış mı, yoksa normal konaklama mı?
                let status = 'Dolu';
                if (startDate.getTime() === today.getTime()) {
                    status = 'Bugün Giriş';
                } else if (endDate.getTime() === today.getTime() && currentHour < checkoutHour) {
                    status = 'Bugün Çıkış';
                }
                
                row.innerHTML = `
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td class="status-cell ${status === 'Dolu' ? 'status-occupied' : (status === 'Bugün Giriş' ? 'status-arriving' : 'status-departing')}">${status}</td>
                    <td>
                        ${lea.isim}
                        ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                    </td>
                    <td>${formatDate(startDate)} - ${formatDate(endDate)}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td class="status-cell status-available">Müsait</td>
                    <td>-</td>
                    <td>-</td>
                `;
            }
            
            tableBody.appendChild(row);
        });
        
        console.log("Doluluk detayları güncellendi");
    } catch (error) {
        console.error("updateOccupancyDetails hatası:", error);
    }
}

// Doluluk oranını hesapla
function calculateOccupancyRate(activeAssignments) {
    try {
        if (!villas || villas.length === 0) {
            console.warn("Villa verileri eksik, doluluk oranı hesaplanamadı");
            return 0;
        }
        
        // Dolu villaların tekrar etmeksizin listesini oluştur
        const occupiedVillaNames = [];
        activeAssignments.forEach(assignment => {
            if (!occupiedVillaNames.includes(assignment.villa)) {
                occupiedVillaNames.push(assignment.villa);
            }
        });
        
        // Doluluk oranını yüzde olarak hesapla
        const occupancyRate = Math.round((occupiedVillaNames.length / villas.length) * 100);
        return occupancyRate;
    } catch (error) {
        console.error("calculateOccupancyRate hatası:", error);
        return 0; // Hata durumunda 0 dön
    }
}

// Günlük Brief yazdır
function printDailyBrief() {
    const briefTitle = "Villa Yönetim Sistemi - Günlük Brief";
    const fileName = `Brief_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // İçerik oluştur
    const briefContent = document.createElement('div');
    briefContent.className = 'brief-print-content';
    
    const header = document.createElement('div');
    header.className = 'print-header';
    header.innerHTML = `
        <h1>${briefTitle}</h1>
        <p>${document.getElementById('briefDate').textContent}</p>
    `;
    
    const summary = document.createElement('div');
    summary.className = 'print-summary';
    summary.innerHTML = `
        <div class="summary-metric">
            <div class="metric-label">Bugün Gelenler</div>
            <div class="metric-value">${document.getElementById('arrivalsCount').textContent}</div>
        </div>
        <div class="summary-metric">
            <div class="metric-label">Bugün Ayrılanlar</div>
            <div class="metric-value">${document.getElementById('departuresCount').textContent}</div>
        </div>
        <div class="summary-metric">
            <div class="metric-label">Doluluk Oranı</div>
            <div class="metric-value">${document.getElementById('occupancyRate').textContent}</div>
        </div>
    `;
    
    // Tabloları kopyala
    const arrivalsTable = document.getElementById('arrivalsTable').cloneNode(true);
    const departuresTable = document.getElementById('departuresTable').cloneNode(true);
    const occupancyTable = document.getElementById('occupancyTable').cloneNode(true);
    
    // Gelenler bölümü
    const arrivalsSection = document.createElement('div');
    arrivalsSection.className = 'print-section';
    arrivalsSection.innerHTML = `<h2>Bugün Gelen Misafirler</h2>`;
    arrivalsSection.appendChild(arrivalsTable);
    
    // Ayrılanlar bölümü
    const departuresSection = document.createElement('div');
    departuresSection.className = 'print-section';
    departuresSection.innerHTML = `<h2>Bugün Ayrılan Misafirler</h2>`;
    departuresSection.appendChild(departuresTable);
    
    // Doluluk bölümü
    const occupancySection = document.createElement('div');
    occupancySection.className = 'print-section';
    occupancySection.innerHTML = `<h2>Doluluk Detayları</h2>`;
    
    // Doluluk özeti
    const occupancySummary = document.createElement('div');
    occupancySummary.className = 'occupancy-summary print-occupancy-summary';
    
    const villaTypes = ['General', 'Presidential', 'Sunset', 'Citrus', 'Forest', 'Maki'];
    
    villaTypes.forEach(type => {
        const elementId = `${type.toLowerCase()}Occupancy`;
        const rate = document.getElementById(elementId).textContent;
        
        const metricDiv = document.createElement('div');
        metricDiv.className = 'occupancy-metric';
        metricDiv.innerHTML = `
            <div class="metric-title">${type}</div>
            <div class="metric-value">${rate}</div>
        `;
        
        occupancySummary.appendChild(metricDiv);
    });
    
    occupancySection.appendChild(occupancySummary);
    occupancySection.appendChild(occupancyTable);
    
    // Hepsini birleştir
    briefContent.appendChild(header);
    briefContent.appendChild(summary);
    briefContent.appendChild(arrivalsSection);
    briefContent.appendChild(departuresSection);
    briefContent.appendChild(occupancySection);
    
    // Yazdırma stillerini ayarla
    const style = document.createElement('style');
    style.innerHTML = `
        .brief-print-content {
            font-family: 'Arial', sans-serif;
            padding: 20px;
        }
        .print-header {
            text-align: center;
            margin-bottom: 20px;
        }
        .print-header h1 {
            color: #1565c0;
            margin-bottom: 5px;
        }
        .print-summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .summary-metric {
            text-align: center;
        }
        .metric-label {
            font-size: 14px;
            color: #555;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1565c0;
        }
        .print-section {
            margin-bottom: 30px;
        }
        .print-section h2 {
            color: #1565c0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .print-occupancy-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .occupancy-metric {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 10px;
            text-align: center;
        }
        .brief-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .brief-table th {
            background-color: #f2f2f2;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        .brief-table td {
            padding: 8px;
            border: 1px solid #ddd;
        }
        .brief-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .compact-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            color: white;
        }
        .compact-status.aktif { background-color: #2e7d32; }
        .compact-status.geçmiş { background-color: #757575; }
        .empty-villa { color: #999; }
    `;
    
    // PDF oluştur
    const opt = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // SweetAlert ile işlemi göster
    Swal.fire({
        title: 'PDF Hazırlanıyor',
        text: 'Lütfen bekleyin...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            
            // PDF'i oluşturmak için geçici bir div oluştur
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(style);
            tempDiv.appendChild(briefContent);
            document.body.appendChild(tempDiv);
            
            // PDF oluştur
            html2pdf().from(tempDiv).set(opt).save()
            .then(() => {
                document.body.removeChild(tempDiv);
                Swal.fire({
                    title: 'Başarılı',
                    text: 'Günlük brief raporu indirildi!',
                    icon: 'success',
                    confirmButtonText: 'Tamam'
                });
            }).catch(err => {
                console.error('PDF hatası:', err);
                Swal.fire({
                    title: 'Hata',
                    text: 'PDF oluşturulurken bir hata oluştu!',
                    icon: 'error',
                    confirmButtonText: 'Tamam'
                });
            });
        }
    });
}

// Daily Brief Raporu oluştur (Rapor modülü için)
function generateDailyBriefReport(statusFilter, startDate, endDate) {
    // Şimdiki tarih için brief
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Bugün gelenler
    const arrivingToday = assignments.filter(assignment => {
        const startAssignDate = new Date(assignment.startDate);
        startAssignDate.setHours(0, 0, 0, 0);
        return startAssignDate.getTime() === today.getTime();
    });
    
    // Bugün ayrılanlar
    const departingToday = assignments.filter(assignment => {
        const endAssignDate = new Date(assignment.endDate);
        endAssignDate.setHours(0, 0, 0, 0);
        return endAssignDate.getTime() === today.getTime();
    });
    
    // Aktif atamalar
    const activeAssignments = assignments.filter(assignment => {
        const assignStart = new Date(assignment.startDate);
        const assignEnd = new Date(assignment.endDate);
        return assignStart <= today && assignEnd >= today;
    });
    
    // Doluluk oranı
    const occupancyRate = calculateOccupancyRate(activeAssignments);
    
    let html = `
        <div class="report-content">
            <div class="report-header">
                <h2>Günlük Brief Raporu</h2>
                <p>Oluşturma Tarihi: ${today.toLocaleDateString('tr-TR')}</p>
            </div>
            
            <div class="report-summary-stats">
                <div class="summary-stat">
                    <span class="stat-label">Bugün Gelenler</span>
                    <span class="stat-value">${arrivingToday.length}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Bugün Ayrılanlar</span>
                    <span class="stat-value">${departingToday.length}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Doluluk Oranı</span>
                    <span class="stat-value">${occupancyRate}%</span>
                </div>
            </div>
    `;
    
    // Gelenler tablosu
    html += `
        <h3>Bugün Gelen Misafirler</h3>
    `;
    
    if (arrivingToday.length > 0) {
        html += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Villa</th>
                        <th>Kategori</th>
                        <th>LEA</th>
                        <th>Giriş Saati</th>
                        <th>Gece Sayısı</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        arrivingToday.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        arrivingToday.forEach(assignment => {
            const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
            
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            html += `
                <tr>
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td>
                        ${lea.isim}
                        ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                    </td>
                    <td>14:00</td>
                    <td>${nights} gece</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
    } else {
        html += `<p class="no-data">Bugün gelen misafir bulunmuyor.</p>`;
    }
    
    // Ayrılanlar tablosu
    html += `
        <h3>Bugün Ayrılan Misafirler</h3>
    `;
    
    if (departingToday.length > 0) {
        html += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Villa</th>
                        <th>Kategori</th>
                        <th>LEA</th>
                        <th>Çıkış Saati</th>
                        <th>Konaklama Süresi</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        departingToday.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        
        departingToday.forEach(assignment => {
            const villa = villas.find(v => v.isim === assignment.villa) || { isim: assignment.villa, kategori: 'Bilinmiyor' };
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
            
            const startDate = new Date(assignment.startDate);
            const endDate = new Date(assignment.endDate);
            const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            html += `
                <tr>
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td>
                        ${lea.isim}
                        ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                    </td>
                    <td>12:00</td>
                    <td>${nights} gece</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
    } else {
        html += `<p class="no-data">Bugün ayrılan misafir bulunmuyor.</p>`;
    }
    
    // Doluluk tablosu
    html += `
        <h3>Doluluk Durumu</h3>
        <div class="occupancy-summary">
    `;
    
    // Villa tiplerine göre doluluk
    const villaTypes = Object.values(VILLA_TYPES);
    
    villaTypes.unshift('Genel'); // Genel doluluk oranını başa ekle
    
    villaTypes.forEach(type => {
        let typeOccupancy = occupancyRate;
        
        if (type !== 'Genel') {
            const villasByType = villas.filter(v => v.tip === type);
            const occupiedVillasByType = activeAssignments.filter(a => {
                const villa = villas.find(v => v.isim === a.villa);
                return villa && villa.tip === type;
            });
            
            typeOccupancy = villasByType.length > 0 ? 
                Math.round((occupiedVillasByType.length / villasByType.length) * 100) : 0;
        }
        
        html += `
            <div class="occupancy-metric">
                <div class="metric-title">${type}</div>
                <div class="metric-value">${typeOccupancy}%</div>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <table class="report-table">
            <thead>
                <tr>
                    <th>Villa</th>
                    <th>Kategori</th>
                    <th>Durum</th>
                    <th>LEA</th>
                    <th>Giriş</th>
                    <th>Çıkış</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Tüm villaları listele
    const allVillas = [...villas];
    allVillas.sort((a, b) => a.isim.localeCompare(b.isim));
    
    allVillas.forEach(villa => {
        const assignment = activeAssignments.find(a => a.villa === villa.isim);
        const isOccupied = assignment !== undefined;
        
        if (isOccupied) {
            const lea = leas.find(l => l.isim === assignment.lea) || { isim: assignment.lea };
            const secondaryLea = assignment.secondaryLea ? leas.find(l => l.isim === assignment.secondaryLea) : null;
            
            html += `
                <tr>
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td><span class="status-pill aktif">Dolu</span></td>
                    <td>
                        ${lea.isim}
                        ${secondaryLea ? `<br><small>(2. LEA: ${secondaryLea.isim})</small>` : ''}
                    </td>
                    <td>${formatDate(assignment.startDate)}</td>
                    <td>${formatDate(assignment.endDate)}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td>${villa.isim}</td>
                    <td>${villa.kategori}</td>
                    <td><span class="status-pill geçmiş">Boş</span></td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            `;
        }
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    html += `</div>`;
    
    return html;
}

// 3002 numaralı villanın kategori bilgisini güncelle
function updateVilla3002() {
    // Önce villalar listesinde güncelle
    const villa3002 = villas.find(v => v.isim === "3002");
    if (villa3002) {
        console.log("Villa 3002 bulundu, kategori güncelleniyor...");
        console.log("Önceki kategori:", villa3002.kategori);
        villa3002.kategori = "Pina";
        villa3002.tip = VILLA_TYPES.PINA;
        console.log("Güncellenen kategori:", villa3002.kategori);
    }

    // Mevcut atamalardaki villa kategori bilgisini güncelle
    assignments.forEach(assignment => {
        if (assignment.villa === "3002" && assignment.villaKategori) {
            assignment.villaKategori = "Pina";
        }
    });

    // LocalStorage'ı güncelle
    saveToLocalStorage();
}

// Sistem verilerini tamamen yenileme
function refreshSystemData() {
    // Kullanıcıya onay sor
    Swal.fire({
        title: 'Emin misiniz?',
        text: 'Sistem verileri yenilenecek ve tüm veriler güncellenecektir. Firebase\'den en güncel veri çekilecektir.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet, Yenile',
        cancelButtonText: 'İptal',
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#f44336'
    }).then((result) => {
        if (result.isConfirmed) {
            // Yükleniyor göster
            Swal.fire({
                title: 'Yükleniyor...',
                text: 'Veriler yenileniyor',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // LocalStorage'dan yüklenen verileri temizle
            localStorage.removeItem('leas');
            localStorage.removeItem('villas');
            localStorage.removeItem('assignments');
            
            // Firebase'den verileri tekrar yükle
            loadJSONData().then(() => {
                // UI'ı güncelle
                updateUI();
                updateQuickStats();
                updateLeaStats();
                updateDailyBrief();
                
                // Kullanıcıya bilgi ver
                Swal.fire({
                    title: 'Başarılı!',
                    text: 'Sistem verileri yenilendi ve güncel veriler yüklendi.',
                    icon: 'success',
                    confirmButtonText: 'Tamam'
                });
            }).catch(error => {
                console.error("Yenileme hatası:", error);
                
                Swal.fire({
                    title: 'Hata!',
                    text: 'Sistem verileri yenilenirken bir hata oluştu.',
                    icon: 'error',
                    confirmButtonText: 'Tamam'
                });
            });
        }
    });
}

// Villa 3002 için zorunlu güncelleme
function forceUpdateVilla3002() {
    console.log("Villa 3002 için zorlu güncelleme yapılıyor...");
    
    // Villalar listesindeki 3002'yi bul ve güncelle
    const villa3002 = villas.find(v => v.isim === "3002");
    if (villa3002) {
        villa3002.kategori = "Pina";
        villa3002.tip = VILLA_TYPES.PINA;
        console.log("Villa 3002 güncellendi:", villa3002);
    } else {
        console.warn("Villa 3002 bulunamadı!");
    }
    
    // Tüm atamalarda 3002 ile ilgili bilgileri güncelle
    assignments.forEach(assignment => {
        if (assignment.villa === "3002") {
            assignment.villaKategori = "Pina";
            console.log("Villa 3002 için atama güncellendi:", assignment.id);
        }
    });
    
    // LocalStorage'ı güncelle
    saveToLocalStorage();
    
    // Select listelerini güncelle
    updateSelects();
}

// Firebase veritabanına veri yükleme fonksiyonları
async function uploadDataToFirebase() {
    try {
        // Kullanıcıya onay sor
        const result = await Swal.fire({
            title: 'Firebase\'e Veri Yükleme',
            text: 'Mevcut veri Firebase\'e yüklenecek. Bu işlem mevcut verilerin üzerine yazabilir. Devam etmek istiyor musunuz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Yükle',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#4caf50',
            cancelButtonColor: '#f44336'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Yükleniyor...',
            text: 'Veriler Firebase\'e yükleniyor',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Eğer yerel JSON dosyalarından veri yoksa önce onları yükle
        if (leas.length === 0 || villas.length === 0) {
            await loadFromJSONFiles();
        }

        // LEA verilerini Firestore'a yükle
        const leaBatch = db.batch();
        leas.forEach(lea => {
            const docRef = db.collection('leas').doc(lea.id);
            leaBatch.set(docRef, {
                isim: lea.isim,
                kategori: lea.kategori
            });
        });
        await leaBatch.commit();
        console.log('LEA verileri Firebase\'e yüklendi');

        // Villa verilerini Firestore'a yükle
        const villaBatch = db.batch();
        villas.forEach(villa => {
            const docRef = db.collection('villas').doc(villa.id);
            villaBatch.set(docRef, {
                isim: villa.isim,
                kategori: villa.kategori
            });
        });
        await villaBatch.commit();
        console.log('Villa verileri Firebase\'e yüklendi');

        // Atamaları Firestore'a yükle
        if (assignments.length > 0) {
            const assignmentBatch = db.batch();
            assignments.forEach(assignment => {
                const docRef = db.collection('assignments').doc(assignment.id);
                assignmentBatch.set(docRef, assignment);
            });
            await assignmentBatch.commit();
            console.log('Atamalar Firebase\'e yüklendi');
        }

        Swal.fire({
            title: 'Başarılı!',
            text: 'Tüm veriler Firebase\'e başarıyla yüklendi.',
            icon: 'success',
            confirmButtonText: 'Tamam'
        });

    } catch (error) {
        console.error('Firebase yükleme hatası:', error);
        Swal.fire({
            title: 'Hata!',
            text: 'Firebase\'e veri yüklenirken bir hata oluştu: ' + error.message,
            icon: 'error',
            confirmButtonText: 'Tamam'
        });
    }
} 