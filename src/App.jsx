import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Trash2, 
  Image as ImageIcon, 
  Calendar, 
  Video, 
  List, 
  ChevronRight, 
  ChevronDown, 
  FolderPlus, 
  Folder,
  FolderOpen,
  Lock,
  LogOut,
  Filter,
  CheckCircle2,
  Circle,
  Edit2,
  Check,
  X,
  Menu,
  CheckSquare,
  Square
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDNS6_ckh2s0xcvohH0r76RH50-zFsB7sQ",
  authDomain: "my-lifelog-app.firebaseapp.com",
  projectId: "my-lifelog-app",
  storageBucket: "my-lifelog-app.firebasestorage.app",
  messagingSenderId: "15182730406",
  appId: "1:15182730406:web:cc3f5ca9caae618437d067",
  measurementId: "G-30SSP7BHLW"
};
const appId = "my-local-app"; // 自訂一個 ID 即可

// ★★★ 單人模式設定 ★★★
// 定義一個固定的 ID，讓所有裝置都讀取同一份資料
const SHARED_ID = 'owner';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Component: PIN Entry / Setup Screen ---
const PinScreen = ({ isSetup, onSubmit }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('請輸入 6 位數字密碼');
      return;
    }

    if (isSetup) {
      if (pin !== confirmPin) {
        setError('兩次輸入的密碼不符');
        return;
      }
    }

    onSubmit(pin);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isSetup ? '設定您的個人密碼' : '請輸入密碼解鎖'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {isSetup ? '這將用於保護您的個人資料，請牢記這組 6 碼數字。' : '歡迎回來，請驗證身份。'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center text-3xl tracking-widest py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="••••••"
          />
          
          {isSetup && (
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full text-center text-3xl tracking-widest py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors mt-4"
              placeholder="再次確認"
            />
          )}

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg mt-4"
          >
            {isSetup ? '設定並進入' : '解鎖'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  // Auth & Security State
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading', 'setup', 'lock', 'authenticated'
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  
  // UI State
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'text', 'schedule', 'video', 'todo'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'pending'
  const [expandedCats, setExpandedCats] = useState({}); // Track expanded categories
  
  // Mobile UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Category Editing State
  const [editingCatId, setEditingCatId] = useState(null);
  const [tempCatName, setTempCatName] = useState('');

  // Modal States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // 如果有值代表是編輯模式
  const [newCardType, setNewCardType] = useState('text');
  
  // Card Form Data
  const [cardForm, setCardForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    date: '',
    videoUrl: '',
    todoItems: []
  });

  // New Category State
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [parentCatId, setParentCatId] = useState(null); // For nested categories

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setAuthStatus('loading');
    });
    return () => unsubscribe();
  }, []);

  // Check PIN Status
  useEffect(() => {
    if (!user) return;

    const checkPinSettings = async () => {
      try {
        const settingsRef = doc(db, 'artifacts', appId, 'users', SHARED_ID, 'settings', 'security');
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
          setAuthStatus('lock');
        } else {
          setAuthStatus('setup');
        }
      } catch (err) {
        console.error("Error checking PIN settings:", err);
      }
    };

    checkPinSettings();
  }, [user]);

  // Fetch Data (Categories & Cards)
  useEffect(() => {
    if (!user || authStatus !== 'authenticated') return;

    const catQuery = query(collection(db, 'artifacts', appId, 'users', SHARED_ID, 'categories'));
    const unsubCat = onSnapshot(catQuery, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cats.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(cats);
    }, (error) => console.error("Cat sync error", error));

    const cardQuery = query(collection(db, 'artifacts', appId, 'users', SHARED_ID, 'cards'));
    const unsubCards = onSnapshot(cardQuery, (snapshot) => {
      const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time descending (newest first)
      c.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCards(c);
    }, (error) => console.error("Card sync error", error));

    return () => {
      unsubCat();
      unsubCards();
    };
  }, [user, authStatus]);

  // Handle PIN Logic
  const handlePinSubmit = async (pinInput) => {
    if (!user) return;

    const settingsRef = doc(db, 'artifacts', appId, 'users', SHARED_ID, 'settings', 'security');

    if (authStatus === 'setup') {
      await setDoc(settingsRef, { pin: pinInput, createdAt: serverTimestamp() });
      setAuthStatus('authenticated');
    } else if (authStatus === 'lock') {
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists() && docSnap.data().pin === pinInput) {
        setAuthStatus('authenticated');
      } else {
        alert("密碼錯誤，請重試");
      }
    }
  };

  // --- CRUD Operations ---

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    await addDoc(collection(db, 'artifacts', appId, 'users', SHARED_ID, 'categories'), {
      name: newCatName,
      parentId: parentCatId || null,
      createdAt: serverTimestamp()
    });
    
    if (parentCatId) {
        setExpandedCats(prev => ({ ...prev, [parentCatId]: true }));
    }

    setNewCatName('');
    setIsAddCatOpen(false);
    setParentCatId(null);
  };

  const deleteCategory = async (catId, e) => {
    e.stopPropagation();
    if (confirm('確定刪除此類別？(這不會刪除類別內的卡片，但會刪除子類別的連結)')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'categories', catId));
    }
  };

  const startEditingCategory = (e, cat) => {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setTempCatName(cat.name);
  };

  const cancelEditingCategory = (e) => {
    if(e) e.stopPropagation();
    setEditingCatId(null);
    setTempCatName('');
  };

  const saveCategoryName = async (e, catId) => {
    if(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    if (!tempCatName.trim()) {
        cancelEditingCategory();
        return;
    }

    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'categories', catId), {
            name: tempCatName.trim()
        });
    } catch (err) {
        console.error("Error renaming category:", err);
        alert("更名失敗");
    }
    
    setEditingCatId(null);
    setTempCatName('');
  };

  // Open Modal for Create
  const openCreateCardModal = () => {
      setEditingCard(null);
      setNewCardType('text');
      resetCardForm();
      setIsCardModalOpen(true);
  };

  // Open Modal for Edit
  const openEditCardModal = (card) => {
      setEditingCard(card);
      setNewCardType(card.type);
      setCardForm({
          title: card.title,
          content: card.content || '',
          imageUrl: card.imageUrl || '',
          date: card.date || '',
          videoUrl: card.videoUrl || '',
          todoItems: card.todoItems || []
      });
      // Special handling: if todo, we show text content in textarea by joining items
      // This allows easy bulk editing. We'll try to preserve checks on save.
      if (card.type === 'todo' && card.todoItems) {
          setCardForm(prev => ({
              ...prev,
              content: card.todoItems.map(i => i.text).join('\n')
          }));
      }
      setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    const payload = {
      type: newCardType,
      categoryId: selectedCategoryId || (editingCard ? editingCard.categoryId : null), // Keep existing category if editing
      title: cardForm.title,
      // Only set createdAt on create, not update
      ...(editingCard ? {} : { createdAt: serverTimestamp(), isCompleted: false }),
      ...cardForm
    };

    // Clean up fields
    if (newCardType !== 'text') delete payload.imageUrl;
    if (newCardType !== 'schedule') delete payload.date;
    if (newCardType !== 'video') delete payload.videoUrl;
    if (newCardType !== 'todo') {
        delete payload.todoItems;
    } else {
        // Parse todo content back to items
        const newLines = cardForm.content.split('\n').filter(i => i.trim());
        const newItems = newLines.map(text => {
            // Try to find existing item to preserve 'done' status if editing
            const existing = editingCard?.todoItems?.find(i => i.text === text);
            return { text, done: existing ? existing.done : false };
        });
        payload.todoItems = newItems;
        // Don't save raw content for todo, we use todoItems
        delete payload.content; 
    }

    try {
        if (editingCard) {
            await updateDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'cards', editingCard.id), payload);
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'users', SHARED_ID, 'cards'), payload);
        }
        setIsCardModalOpen(false);
        resetCardForm();
    } catch (err) {
        console.error("Error saving card:", err);
        alert("儲存失敗");
    }
  };

  const toggleCardCompletion = async (card) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'cards', card.id), {
      isCompleted: !card.isCompleted
    });
  };

  const toggleTodoItem = async (card, idx) => {
      const newItems = [...card.todoItems];
      newItems[idx].done = !newItems[idx].done;
      await updateDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'cards', card.id), {
          todoItems: newItems
      });
  };

  const deleteCard = async (cardId) => {
    if (confirm('確定刪除此卡片？')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', SHARED_ID, 'cards', cardId));
    }
  };

  const resetCardForm = () => {
    setCardForm({
      title: '',
      content: '',
      imageUrl: '',
      date: '',
      videoUrl: '',
      todoItems: []
    });
  };

  // --- Helpers ---

  const toggleCategory = (e, catId) => {
    e.stopPropagation();
    setExpandedCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const renderCategories = (parentId = null) => {
    const currentCats = categories.filter(c => c.parentId === parentId);
    
    if (currentCats.length === 0) return null;

    return (
      <ul className="space-y-0.5">
        {currentCats.map(cat => {
          const hasChildren = categories.some(c => c.parentId === cat.id);
          const isExpanded = expandedCats[cat.id];
          const isSelected = selectedCategoryId === cat.id;
          const isEditing = editingCatId === cat.id;

          return (
            <li key={cat.id} className="select-none">
              <div 
                className={`group flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors border border-transparent ${isSelected && !isEditing ? 'bg-blue-100 text-blue-700 border-blue-200' : 'hover:bg-slate-100 text-slate-700'}`}
                onClick={() => { 
                    if(!isEditing) {
                        setSelectedCategoryId(cat.id);
                        if (window.innerWidth < 768) setIsMobileMenuOpen(false);
                    }
                }}
              >
                <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
                  <button 
                    onClick={(e) => toggleCategory(e, cat.id)}
                    className={`p-0.5 rounded hover:bg-black/5 text-slate-400 flex-shrink-0 transition-transform ${hasChildren ? '' : 'invisible'}`}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {isExpanded ? (
                    <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'fill-blue-300 text-blue-600' : 'text-yellow-500 fill-yellow-100'}`} />
                  ) : (
                    <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'fill-blue-300 text-blue-600' : 'text-yellow-500 fill-yellow-100'}`} />
                  )}
                  
                  {isEditing ? (
                      <form 
                        onSubmit={(e) => saveCategoryName(e, cat.id)} 
                        className="flex-1 ml-1 flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                          <input 
                            autoFocus
                            type="text" 
                            value={tempCatName}
                            onChange={(e) => setTempCatName(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Escape') cancelEditingCategory(e); }}
                            className="w-full text-sm px-1.5 py-0.5 border border-blue-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          <button type="submit" className="p-0.5 text-green-600 hover:bg-green-100 rounded">
                              <Check className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={cancelEditingCategory} className="p-0.5 text-red-500 hover:bg-red-100 rounded">
                              <X className="w-3.5 h-3.5" />
                          </button>
                      </form>
                  ) : (
                      <span className="truncate text-sm font-medium ml-1">{cat.name}</span>
                  )}
                </div>

                {!isEditing && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => startEditingCategory(e, cat)}
                        className="p-1 hover:bg-slate-200 text-slate-500 rounded mr-0.5"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setParentCatId(cat.id); 
                            setIsAddCatOpen(true); 
                            setExpandedCats(prev => ({ ...prev, [cat.id]: true }));
                        }}
                        className="p-1 hover:bg-blue-200 text-blue-600 rounded mr-0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => deleteCategory(cat.id, e)}
                        className="p-1 hover:bg-red-100 text-red-500 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                )}
              </div>

              {hasChildren && isExpanded && (
                <div className="ml-[1.1rem] border-l border-slate-200 pl-1 mt-0.5 mb-1">
                  {renderCategories(cat.id)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (card.content && card.content.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchCat = true;
      if (selectedCategoryId) {
          const getDescendantIds = (parentId) => {
              const children = categories.filter(c => c.parentId === parentId);
              let ids = children.map(c => c.id);
              children.forEach(c => {
                  ids = [...ids, ...getDescendantIds(c.id)];
              });
              return ids;
          };
          const relevantIds = [selectedCategoryId, ...getDescendantIds(selectedCategoryId)];
          matchCat = relevantIds.includes(card.categoryId);
      }

      const matchType = filterType === 'all' ? true : card.type === filterType;
      
      let matchStatus = true;
      if (filterStatus === 'completed') matchStatus = card.isCompleted;
      if (filterStatus === 'pending') matchStatus = !card.isCompleted;

      return matchSearch && matchCat && matchType && matchStatus;
    });
  }, [cards, searchQuery, selectedCategoryId, filterType, filterStatus, categories]);

  const getYoutubeEmbed = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  // --- Render Views ---

  if (authStatus === 'loading') {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500">載入中...</div>;
  }

  if (authStatus === 'setup' || authStatus === 'lock') {
    return <PinScreen isSetup={authStatus === 'setup'} onSubmit={handlePinSubmit} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900 font-sans relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-[2px_0_10px_rgba(0,0,0,0.02)]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 h-16">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            My LifeLog
          </h1>
          <button onClick={() => { setAuthStatus('lock'); }} title="鎖定並登出" className="hover:bg-slate-200 p-1.5 rounded-full transition-colors">
            <LogOut className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div 
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer mb-3 font-semibold transition-colors ${!selectedCategoryId ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => {
                setSelectedCategoryId(null);
                if (window.innerWidth < 768) setIsMobileMenuOpen(false);
            }}
          >
            <FolderPlus className="w-5 h-5" />
            <span>所有筆記</span>
          </div>
          
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">資料夾</div>
          {renderCategories()}
          
          {categories.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-8">
                尚無類別<br/>點擊下方按鈕新增
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/30">
          <button 
            onClick={() => { setParentCatId(null); setIsAddCatOpen(true); }}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" /> 新增主類別
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 justify-between gap-3 sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 flex-1 max-w-2xl bg-slate-100 px-4 py-2 rounded-full focus-within:ring-2 ring-blue-500/20 transition-all focus-within:bg-white border border-transparent focus-within:border-blue-200">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="搜尋..." 
              className="bg-transparent border-none outline-none w-full text-slate-700 placeholder-slate-400 min-w-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button 
            onClick={openCreateCardModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-full font-medium shadow-lg shadow-blue-200 transition-all active:scale-95 hover:-translate-y-0.5 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">新增卡片</span>
          </button>
        </header>

        {/* Filters */}
        <div className="px-4 md:px-8 py-4 md:py-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm hover:border-blue-300 transition-colors">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-slate-500 hidden sm:inline">狀態:</span>
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
                >
                    <option value="all">全部</option>
                    <option value="completed">已完成</option>
                    <option value="pending">未完成</option>
                </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm hover:border-blue-300 transition-colors">
                <span className="text-slate-500 hidden sm:inline">類型:</span>
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
                >
                    <option value="all">所有類型</option>
                    <option value="text">圖文卡</option>
                    <option value="schedule">排程卡</option>
                    <option value="video">影片卡</option>
                    <option value="todo">清單卡</option>
                </select>
            </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredCards.map(card => (
              <div 
                key={card.id} 
                className={`group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:border-blue-200 ${card.isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                {/* Card Header (Type Icon & Actions) */}
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {card.type === 'text' && <><ImageIcon className="w-3.5 h-3.5 text-blue-500" /> 圖文</>}
                        {card.type === 'schedule' && <><Calendar className="w-3.5 h-3.5 text-orange-500" /> 排程</>}
                        {card.type === 'video' && <><Video className="w-3.5 h-3.5 text-red-500" /> 影片</>}
                        {card.type === 'todo' && <><List className="w-3.5 h-3.5 text-green-500" /> 清單</>}
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => toggleCardCompletion(card)}
                            className={`p-1.5 rounded-md transition-colors ${card.isCompleted ? 'text-green-600 bg-green-100' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                            title={card.isCompleted ? "標記未完成" : "標記完成"}
                        >
                            {card.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEditCardModal(card)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCard(card.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Card Content */}
                <div className="p-4 md:p-5 flex-1 flex flex-col gap-3">
                    <h3 className={`font-bold text-lg leading-snug break-words ${card.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {card.title}
                    </h3>

                    {/* Type: Text/Image */}
                    {card.type === 'text' && (
                        <>
                            {card.imageUrl && (
                                <img src={card.imageUrl} alt="card attachment" className="w-full h-36 object-cover rounded-lg mb-2 bg-slate-100 border border-slate-100" />
                            )}
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed break-words">{card.content}</p>
                        </>
                    )}

                    {/* Type: Schedule */}
                    {card.type === 'schedule' && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-1">
                             <div className="flex items-center gap-2 text-orange-700 font-bold text-sm mb-1.5">
                                <Calendar className="w-4 h-4" />
                                {card.date ? new Date(card.date).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '未設定時間'}
                             </div>
                             <p className="text-sm text-slate-600 break-words">{card.content}</p>
                        </div>
                    )}

                    {/* Type: Video */}
                    {card.type === 'video' && (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video relative shadow-inner">
                            {getYoutubeEmbed(card.videoUrl) ? (
                                <iframe 
                                    src={getYoutubeEmbed(card.videoUrl)} 
                                    className="w-full h-full" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col gap-2 items-center justify-center text-white text-xs p-4 text-center">
                                   <Video className="w-8 h-8 opacity-50" />
                                   <a href={card.videoUrl} target="_blank" className="underline hover:text-blue-300 break-all">無法預覽，點擊開啟連結</a>
                                </div>
                            )}
                        </div>
                    )}

                     {/* Type: Todo List */}
                     {card.type === 'todo' && (
                        <ul className="space-y-1 mt-1">
                            {card.todoItems && card.todoItems.map((item, idx) => (
                                <li 
                                    key={idx} 
                                    className={`flex items-start gap-2.5 text-sm p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors ${item.done ? 'text-slate-400' : 'text-slate-700'}`}
                                    onClick={() => toggleTodoItem(card, idx)}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? 'bg-green-500 border-green-500' : 'border-slate-400 bg-white'}`}>
                                        {item.done && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`leading-relaxed break-words flex-1 ${item.done ? 'line-through decoration-slate-400' : ''}`}>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
              </div>
            ))}
            
            {filteredCards.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                        <FolderOpen className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-lg font-medium">沒有找到符合條件的任務卡片</p>
                    <p className="text-sm mt-2">試著切換類別或新增一張卡片吧！</p>
                </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Modals --- */}
      
      {/* Add Category Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-[90vw] md:w-96 shadow-2xl scale-100 transform transition-all">
            <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                {parentCatId ? '新增子類別' : '新增主類別'}
            </h3>
            <form onSubmit={addCategory}>
              <input 
                autoFocus
                type="text" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="輸入類別名稱..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 focus:ring-2 ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddCatOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[95vw] md:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                {editingCard ? (
                    <>
                        <Edit2 className="w-6 h-6 text-orange-600 bg-orange-50 rounded-full p-1" />
                        編輯任務卡片
                    </>
                ) : (
                    <>
                        <Plus className="w-6 h-6 text-blue-600 bg-blue-50 rounded-full p-1" />
                        新增任務卡片
                    </>
                )}
            </h3>
            
            <form onSubmit={handleSaveCard} className="space-y-5">
                {/* Type Selector (Only selectable when creating new) */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">卡片類型</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'text', label: '圖文', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                            { id: 'schedule', label: '排程', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                            { id: 'video', label: '影片', icon: Video, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                            { id: 'todo', label: '清單', icon: List, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                // Lock type selection when editing
                                onClick={() => !editingCard && setNewCardType(t.id)}
                                className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl border transition-all duration-200 
                                    ${newCardType === t.id ? `${t.border} ${t.bg} ${t.color} ring-1 ring-offset-1 ring-${t.color.split('-')[1]}-400 font-bold shadow-sm` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}
                                    ${editingCard && newCardType !== t.id ? 'opacity-40 cursor-not-allowed' : ''}
                                `}
                            >
                                <t.icon className="w-5 h-5" />
                                <span className="text-xs">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">標題</label>
                    <input 
                        required
                        type="text" 
                        value={cardForm.title}
                        onChange={e => setCardForm({...cardForm, title: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="輸入任務標題..."
                    />
                </div>

                {/* Dynamic Fields based on Type */}
                
                {/* Text / Image */}
                {newCardType === 'text' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">圖片網址 <span className="text-slate-400 font-normal text-xs">(選填)</span></label>
                            <input 
                                type="url" 
                                value={cardForm.imageUrl}
                                onChange={e => setCardForm({...cardForm, imageUrl: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 ring-blue-500 outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">內容</label>
                            <textarea 
                                value={cardForm.content}
                                onChange={e => setCardForm({...cardForm, content: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 h-32 focus:ring-2 ring-blue-500 outline-none transition-all resize-none"
                                placeholder="詳細說明..."
                            />
                        </div>
                    </>
                )}

                {/* Schedule */}
                {newCardType === 'schedule' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">日期時間</label>
                            <input 
                                required
                                type="datetime-local" 
                                value={cardForm.date}
                                onChange={e => setCardForm({...cardForm, date: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 ring-blue-500 outline-none transition-all"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">備註</label>
                            <textarea 
                                value={cardForm.content}
                                onChange={e => setCardForm({...cardForm, content: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 h-24 focus:ring-2 ring-blue-500 outline-none transition-all"
                                placeholder="例如：地點、攜帶物品..."
                            />
                        </div>
                    </>
                )}

                {/* Video */}
                {newCardType === 'video' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">影片連結 (YouTube)</label>
                        <input 
                            required
                            type="url" 
                            value={cardForm.videoUrl}
                            onChange={e => setCardForm({...cardForm, videoUrl: e.target.value})}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 ring-blue-500 outline-none transition-all"
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                         <p className="text-xs text-slate-500 mt-1">支援 YouTube 網址，將自動轉換為播放器。</p>
                    </div>
                )}

                {/* Todo List */}
                {newCardType === 'todo' && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">清單項目 <span className="text-slate-400 font-normal text-xs">(每行一項)</span></label>
                        <textarea 
                            value={cardForm.content}
                            onChange={e => {
                                setCardForm({...cardForm, content: e.target.value});
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 h-40 focus:ring-2 ring-blue-500 outline-none transition-all font-mono text-sm"
                            placeholder="買牛奶&#10;去郵局&#10;倒垃圾"
                        />
                         <p className="text-xs text-slate-500 mt-1">編輯模式下，修改文字不會影響未變動項目的勾選狀態。</p>
                    </div>
                )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-medium">取消</button>
                <button 
                    type="submit" 
                    className={`px-5 py-2.5 text-white rounded-lg shadow-lg transition-all active:scale-95 font-bold 
                        ${editingCard ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}
                    `}
                >
                    {editingCard ? '儲存變更' : '建立卡片'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}