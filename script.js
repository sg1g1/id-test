/**
 * ملف السكريبت الرئيسي لتطبيق حسابات الألعاب
 */

let currentUser = null;
let githubStorage = null;

// تبديل وضع الألوان (الوضع الداكن/الفاتح)
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// تهيئة التخزين في GitHub
function initGithubStorage() {
  const token = document.getElementById('githubToken').value;
  if (token) {
    githubStorage = new GitHubStorage(token);
    return true;
  }
  return false;
}

// تهيئة التطبيق عند تحميل الصفحة
window.onload = async function() {
  // تهيئة التخزين
  initGithubStorage();
  
  // التحقق من وجود مستخدم مسجل الدخول
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      const users = await getUsers();
      if (users && users[savedUser]) {
        currentUser = savedUser;
        document.getElementById("auth").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        document.getElementById("playerName").textContent = users[savedUser].username;
        document.getElementById("loginTitle").style.display = "none";
        await updateSections();
        await renderFriendsView();
      } else {
        // إذا لم يتم العثور على المستخدم، قم بتسجيل الخروج
        logout();
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات المستخدم:', error);
      // عرض رسالة خطأ للمستخدم
      alert('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
      logout();
    }
  }
  
  // تطبيق إعدادات المظهر المحفوظة
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  
  const savedColor = localStorage.getItem('themeColor');
  if (savedColor) {
    document.getElementById('themeColor').value = savedColor;
    changeThemeColor(savedColor);
  }
};

// وظائف للتعامل مع البيانات
async function getUsers() {
  // إذا كان المستخدم ضيفًا، استخدم التخزين المحلي فقط
  if (currentUser === 'guest') {
    return JSON.parse(localStorage.getItem('guestData') || '{"sections": [], "friends": []}');
  }
  
  // إذا كانت إعدادات GitHub متوفرة، استخدمها
  if (githubStorage) {
    try {
      const data = await githubStorage.getData();
      return data || {};
    } catch (error) {
      console.error('خطأ في جلب البيانات من GitHub:', error);
    }
  }
  
  // محاولة استخدام الخادم المحلي كخيار ثانوي
  try {
    const response = await fetch('api.php');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('خطأ في جلب البيانات من الخادم:', error);
  }
  
  // استخدام التخزين المحلي كنسخة احتياطية
  const localData = localStorage.getItem("genshinUsers");
  return localData ? JSON.parse(localData) : {};
}

async function saveUsers(users) {
  if (!users) {
    console.error('محاولة حفظ بيانات فارغة');
    return false;
  }
  
  if (currentUser === 'guest') {
    localStorage.setItem('guestData', JSON.stringify(users));
    return true;
  }
  
  // إذا كانت إعدادات GitHub متوفرة، استخدمها
  if (githubStorage) {
    try {
      const success = await githubStorage.saveData(users);
      if (success) return true;
    } catch (error) {
      console.error('خطأ في حفظ البيانات على GitHub:', error);
    }
  }
  
  // محاولة استخدام الخادم المحلي كخيار ثانوي
  try {
    const response = await fetch('api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(users)
    });
    
    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error('خطأ في حفظ البيانات على الخادم:', error);
  }
  
  // حفظ البيانات محلياً كنسخة احتياطية
  localStorage.setItem("genshinUsers", JSON.stringify(users));
  return true;
}

async function register() {
  const username = document.getElementById('username').value.trim();
  const passcode = document.getElementById('passcode').value.trim();
  const loginError = document.getElementById('loginError');

  if (!username || !passcode) {
    loginError.textContent = "يرجى ملء جميع الحقول.";
    loginError.style.display = "block";
    return;
  }

  try {
    const users = await getUsers();
    if (users[passcode]) {
      loginError.textContent = "الرمز مستخدم مسبقًا. جرب رمزًا آخر.";
      loginError.style.display = "block";
      return;
    }

    users[passcode] = { username, sections: [], friends: [] };
    const success = await saveUsers(users);
    
    if (success) {
      loginError.style.display = "none";
      alert("تم التسجيل بنجاح!");
    } else {
      loginError.textContent = "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.";
      loginError.style.display = "block";
    }
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    loginError.textContent = "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.";
    loginError.style.display = "block";
  }
}

async function loginAsGuest() {
  currentUser = 'guest';
  document.getElementById("auth").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("playerName").textContent = 'ضيف';
  document.getElementById("loginTitle").style.display = "none";
  document.getElementById("loginError").style.display = "none";
  
  // استرجاع البيانات المحلية للضيف
  const guestData = JSON.parse(localStorage.getItem('guestData') || '{"sections": [], "friends": []}');
  await updateSections();
  await renderFriendsView();
}

async function deleteAllAccounts() {
  if (confirm('هل أنت متأكد من حذف جميع الحسابات؟')) {
    localStorage.clear();
    if (githubStorage) {
      try {
        await githubStorage.saveData({});
      } catch (error) {
        console.error('خطأ في حذف البيانات من GitHub:', error);
      }
    }
    alert('تم حذف جميع الحسابات بنجاح!');
  }
}

async function login() {
  const passcode = document.getElementById('passcode').value.trim();
  const token = document.getElementById('githubToken').value.trim();
  const loginError = document.getElementById('loginError');
  
  if (!passcode) {
    loginError.textContent = "يرجى إدخال رمز الدخول";
    loginError.style.display = "block";
    return;
  }

  try {
    // تهيئة التخزين في GitHub إذا تم توفير التوكن
    if (token) {
      const initialized = initGithubStorage();
      if (!initialized) {
        loginError.textContent = "فشل في تهيئة الاتصال بـ GitHub. يرجى التحقق من التوكن";
        loginError.style.display = "block";
        return;
      }
    }
    
    // محاولة جلب البيانات
    const users = await getUsers();

    if (!users) {
      loginError.textContent = "حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً";
      loginError.style.display = "block";
      return;
    }

    if (!users[passcode]) {
      loginError.textContent = "رمز الدخول غير صحيح. يرجى التأكد من الرمز وإعادة المحاولة";
      loginError.style.display = "block";
      return;
    }

    // بدء المزامنة التلقائية للبيانات إذا كان GitHub متاحًا
    if (githubStorage) {
      githubStorage.startPolling(async (updatedData) => {
        if (updatedData && updatedData[passcode]) {
          document.getElementById("playerName").textContent = updatedData[passcode].username;
          await updateSections();
          await renderFriendsView();
        }
      });
    }
    
    currentUser = passcode;
    // حفظ حالة تسجيل الدخول
    localStorage.setItem('currentUser', passcode);
    
    document.getElementById("auth").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("playerName").textContent = users[passcode].username;
    document.getElementById("loginTitle").style.display = "none";
    loginError.style.display = "none";
    await updateSections();
    await renderFriendsView();
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    loginError.textContent = "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى";
    loginError.style.display = "block";
    document.getElementById("passcode").value = "";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  // إيقاف المزامنة التلقائية
  if (githubStorage) {
    githubStorage.stopPolling();
  }
  document.getElementById("auth").style.display = "block";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("loginTitle").style.display = "block";
  document.getElementById("username").value = "";
  document.getElementById("passcode").value = "";
  document.getElementById("loginError").style.display = "none";
}

async function addSection() {
  const sectionName = document.getElementById('sectionName').value.trim();
  
  if (!sectionName) {
    alert('يرجى إدخال اسم القسم');
    return;
  }
  
  try {
    const users = await getUsers();
    
    // التحقق من وجود المستخدم الحالي
    if (!users[currentUser]) {
      // إنشاء مستخدم ضيف إذا لم يكن موجوداً
      users[currentUser] = { sections: [] };
    }
    
    const user = users[currentUser];
    
    if (!user.sections) {
      user.sections = [];
    }
    
    if (user.sections.includes(sectionName)) {
      alert('هذا القسم موجود بالفعل');
      return;
    }
    
    user.sections.push(sectionName);
    await saveUsers(users);
    
    // تنظيف حقل الإدخال
    document.getElementById('sectionName').value = '';
    
    // تحديث واجهة المستخدم
    await updateSections();
    alert(`تم إضافة قسم ${sectionName} بنجاح!`);
  } catch (error) {
    console.error('خطأ في إضافة القسم:', error);
    alert('حدث خطأ أثناء إضافة القسم. يرجى المحاولة مرة أخرى.');
  }
}

async function addFriend() {
  const friendName = document.getElementById('friendName').value.trim() || 'بدون اسم';
  const friendID = document.getElementById('friendUID').value.trim() || 'بدون ID';
  const section = document.getElementById('friendSection').value || '';

  try {
    const users = await getUsers();
    const user = users[currentUser];
    
    if (!user) {
      alert("حدث خطأ في النظام. لم يتم العثور على بيانات المستخدم.");
      return;
    }
    
    // تهيئة مصفوفة الأصدقاء إذا لم تكن موجودة
    if (!user.friends) user.friends = [];
    
    user.friends.push({ name: friendName, id: friendID, section });
    await saveUsers(users);
    await renderFriendsView();

    document.getElementById('friendName').value = "";
    document.getElementById('friendID').value = "";
  } catch (error) {
    console.error('خطأ في إضافة صديق:', error);
    alert("حدث خطأ أثناء إضافة الصديق. يرجى المحاولة مرة أخرى.");
  }
}

async function updateSections() {
  try {
    const users = await getUsers();
    const user = users[currentUser];
    
    if (!user) {
      console.error('لم يتم العثور على بيانات المستخدم');
      return;
    }
    
    // تهيئة مصفوفة الأقسام إذا لم تكن موجودة
    if (!user.sections) user.sections = [];
    
    // تحديث قوائم الاختيار أولاً
    updateSelects(user.sections);
    
    const sectionsContainer = document.getElementById('sectionsContainer');
    sectionsContainer.innerHTML = "";
    
    // إضافة عنوان للأقسام
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = 'الأقسام المتوفرة';
    sectionsContainer.appendChild(sectionTitle);
    
    if (user.sections.length === 0) {
      const noSections = document.createElement('p');
      noSections.textContent = 'لا توجد أقسام حالياً';
      noSections.className = 'no-sections';
      sectionsContainer.appendChild(noSections);
    } else {
      const sectionsGrid = document.createElement('div');
      sectionsGrid.className = 'sections-grid';
      
      user.sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-card';
        
        const sectionName = document.createElement('h4');
        sectionName.textContent = section;
        
        const friendCount = user.friends ? user.friends.filter(f => f.section === section).length : 0;
        const countSpan = document.createElement('span');
        countSpan.textContent = `${friendCount} حساب`;
        countSpan.className = 'friend-count';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'حذف';
        deleteBtn.className = 'delete-section';
        deleteBtn.onclick = () => deleteSection(section);
        
        sectionDiv.appendChild(sectionName);
        sectionDiv.appendChild(countSpan);
        sectionDiv.appendChild(deleteBtn);
        sectionsGrid.appendChild(sectionDiv);
      });
      
      sectionsContainer.appendChild(sectionsGrid);
    }
    
    // تحديث قوائم الاختيار
    updateSelects(user.sections);
  } catch (error) {
    console.error('خطأ في تحديث الأقسام:', error);
  }
}

function updateSelects(sections) {
  const sectionSelect = document.getElementById('friendSection');
  const viewSelect = document.getElementById('viewSelect');
  
  if (!sections || !Array.isArray(sections)) {
    sections = [];
  }

  // تنظيف القوائم المنسدلة
  if (sectionSelect) {
    sectionSelect.innerHTML = "<option value=\"\">بدون قسم</option>";
    
    sections.forEach(section => {
      if (section && section.trim()) {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
      }
    });
  }

  if (viewSelect) {
    viewSelect.innerHTML = "<option value=\"all\">الكل</option><option value=\"\">بدون قسم</option>";
    
    sections.forEach(section => {
      if (section && section.trim()) {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        viewSelect.appendChild(option);
      }
    });
  }
}

async function deleteSection(sectionName) {
  if (confirm(`هل أنت متأكد من حذف قسم "${sectionName}"؟`)) {
    try {
      const users = await getUsers();
      const user = users[currentUser];
      
      user.sections = user.sections.filter(s => s !== sectionName);
      if (user.friends) {
        user.friends = user.friends.filter(f => f.section !== sectionName);
      }
      
      await saveUsers(users);
      await updateSections();
      await renderFriendsView();
      
      alert(`تم حذف قسم ${sectionName} بنجاح!`);
    } catch (error) {
      console.error('خطأ في حذف القسم:', error);
      alert('حدث خطأ أثناء حذف القسم. يرجى المحاولة مرة أخرى.');
    }
  }
}

async function renderFriendsView() {
  try {
    const users = await getUsers();
    const user = users[currentUser];
    
    if (!user) {
      console.error('لم يتم العثور على بيانات المستخدم');
      return;
    }
    
    // تهيئة مصفوفة الأصدقاء إذا لم تكن موجودة
    if (!user.friends) user.friends = [];
    
    const selectedView = document.getElementById('viewSelect').value;
    const list = document.getElementById('friendList');
    list.innerHTML = "";

    const filteredFriends = user.friends
      .filter(f => selectedView === "all" || f.section === selectedView);

    filteredFriends.forEach(f => {
      const li = document.createElement("li");
      li.setAttribute('draggable', 'true');
      li.dataset.friendId = f.id;
      li.textContent = `${f.name} - ID: ${f.id} ${selectedView === "all" ? `( ${f.section || 'بدون قسم'} )` : ""}`;
      
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = "<span style='font-size:16px'>🗑️</span>";
      deleteBtn.style.marginRight = "10px";
      deleteBtn.style.borderRadius = "50%";
      deleteBtn.style.width = "35px";
      deleteBtn.style.height = "35px";
      deleteBtn.style.padding = "5px";
      deleteBtn.onclick = () => deleteFriend(f.id);
      li.insertBefore(deleteBtn, li.firstChild);
      
      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = "<span style='font-size:16px'>📋</span>";
      copyBtn.style.marginRight = "10px";
      copyBtn.style.borderRadius = "50%";
      copyBtn.style.width = "35px";
      copyBtn.style.height = "35px";
      copyBtn.style.padding = "5px";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(f.id);
        alert("تم نسخ ID بنجاح!");
      };
      li.insertBefore(copyBtn, li.firstChild);
      
      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragover', handleDragOver);
      li.addEventListener('drop', handleDrop);
      
      list.appendChild(li);
    });
  } catch (error) {
    console.error('خطأ في عرض الأصدقاء:', error);
  }
}

function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.friendId);
  e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e) {
  e.preventDefault();
  const draggedId = e.dataTransfer.getData('text/plain');
  const dropTarget = e.target.closest('li');
  
  if (dropTarget && dropTarget.dataset.friendId !== draggedId) {
    try {
      const users = await getUsers();
      const user = users[currentUser];
      
      if (!user || !user.friends) {
        console.error('لم يتم العثور على بيانات المستخدم أو الأصدقاء');
        return;
      }
      
      const friends = user.friends;
      
      const draggedIndex = friends.findIndex(f => f.id === draggedId);
      const dropIndex = friends.findIndex(f => f.id === dropTarget.dataset.friendId);
      
      if (draggedIndex === -1 || dropIndex === -1) {
        console.error('لم يتم العثور على الصديق المطلوب');
        return;
      }
      
      const [draggedFriend] = friends.splice(draggedIndex, 1);
      friends.splice(dropIndex, 0, draggedFriend);
      
      await saveUsers(users);
      await renderFriendsView();
    } catch (error) {
      console.error('خطأ في نقل الصديق:', error);
    }
  }
  
  document.querySelectorAll('#friendList li').forEach(li => li.style.opacity = '1');
}

async function deleteFriend(friendId) {
  try {
    const users = await getUsers();
    const user = users[currentUser];
    
    if (!user || !user.friends) {
      console.error('لم يتم العثور على بيانات المستخدم أو الأصدقاء');
      return;
    }
    
    user.friends = user.friends.filter(f => f.id !== friendId);
    await saveUsers(users);
    await renderFriendsView();
  } catch (error) {
    console.error('خطأ في حذف الصديق:', error);
    alert("حدث خطأ أثناء حذف الصديق. يرجى المحاولة مرة أخرى.");
  }
}

async function showSectionsList() {
  try {
    const users = await getUsers();
    const user = users[currentUser];
    
    if (!user || !user.sections) {
      console.error('لم يتم العثور على بيانات المستخدم أو الأقسام');
      alert("حدث خطأ في النظام. لم يتم العثور على بيانات المستخدم.");
      return;
    }
    
    let sectionsList = "الأقسام:\n\n";
    
    user.sections.forEach(section => {
      const friendsCount = user.friends ? user.friends.filter(f => f.section === section).length : 0;
      sectionsList += `${section} (${friendsCount} حساب) \n`;
    });
    
    const shouldDelete = confirm(`${sectionsList}\nهل تريد حذف قسم؟`);
    if (shouldDelete) {
      const sectionToDelete = prompt("أدخل اسم القسم الذي تريد حذفه:");
      if (sectionToDelete && user.sections.includes(sectionToDelete)) {
        user.sections = user.sections.filter(s => s !== sectionToDelete);
        if (user.friends) {
          user.friends = user.friends.filter(f => f.section !== sectionToDelete);
        }
        await saveUsers(users);
        await updateSections();
        await renderFriendsView();
        alert(`تم حذف قسم ${sectionToDelete} بنجاح!`);
      } else {
        alert("اسم القسم غير صحيح أو غير موجود.");
      }
    }
  } catch (error) {
    console.error('خطأ في عرض قائمة الأقسام:', error);
    alert("حدث خطأ أثناء عرض قائمة الأقسام. يرجى المحاولة مرة أخرى.");
  }
}

// تبديل طريقة العرض بين الأقسام والأصدقاء
function toggleView(mode) {
  const friendList = document.getElementById('friendList');
  const sectionsContainer = document.querySelector('#viewMode #sectionsContainer');
  
  if (mode === 'sections') {
    friendList.style.display = 'none';
    sectionsContainer.style.display = 'block';
  } else if (mode === 'friends') {
    friendList.style.display = 'block';
    sectionsContainer.style.display = 'none';
    renderFriendsView(); // تحديث عرض قائمة الأصدقاء
  }
}

// تنفيذ التهيئة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
  initGithubStorage();
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
});