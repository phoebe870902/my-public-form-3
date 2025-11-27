import React, { useState, useMemo } from 'react';
import { MOCK_CLASSES, APP_CONFIG } from '../constants';
import { ClassSession, Registration } from '../types';
import { storageService } from '../services/storage';

interface RegistrationFormProps {
  onSubmit: (registrations: Registration[]) => void;
}

const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission if inside button
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
        copied 
          ? 'bg-green-100 text-green-700' 
          : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
      } ${className}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          <span>已複製</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          <span>{label || '複製'}</span>
        </>
      )}
    </button>
  );
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [isPaid, setIsPaid] = useState(false);
  const [paymentLast5, setPaymentLast5] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  // Filter classes into groups
  const yinClasses = useMemo(() => MOCK_CLASSES.filter(c => c.name.includes('陰瑜伽')), []);
  const hathaClasses = useMemo(() => MOCK_CLASSES.filter(c => c.name.includes('哈達')), []);

  const toggleClassSelection = (id: string) => {
    const newSet = new Set(selectedClassIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedClassIds(newSet);
  };

  const calculateTotal = () => {
    return selectedClassIds.size * 400;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedClassIds.size === 0) {
        alert("請至少選擇一堂課程");
        return;
    }

    setIsSubmitting(true);
    setUploadWarning(null);

    const newRegistrations: Registration[] = [];
    const timestamp = Date.now();

    selectedClassIds.forEach(id => {
        const selectedClass = MOCK_CLASSES.find(c => c.id === id);
        if (selectedClass) {
            newRegistrations.push({
                id: crypto.randomUUID(),
                studentName: name,
                lineId: lineId,
                classId: selectedClass.id,
                className: selectedClass.name,
                classDate: selectedClass.date,
                isPaid: isPaid,
                paymentLast5: isPaid ? paymentLast5 : undefined,
                timestamp: timestamp
            });
        }
    });

    // Use service to save data
    const result = await storageService.saveRegistrations(newRegistrations);
    if (result.cloudError) {
        setUploadWarning(result.cloudError);
    }

    onSubmit(newRegistrations);
    setSubmitted(true);
    setIsSubmitting(false);
    
    // Reset form after delay
    setTimeout(() => {
        setName('');
        setLineId('');
        setIsPaid(false);
        setPaymentLast5('');
        setSelectedClassIds(new Set());
        setSubmitted(false);
        setUploadWarning(null);
    }, 5000);
  };

  const renderClassList = (classes: ClassSession[]) => (
    <div className="space-y-3">
      {classes.map((cls) => (
        <label
          key={cls.id}
          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
            selectedClassIds.has(cls.id)
              ? 'bg-sage-50 border-sage-500 shadow-sm ring-1 ring-sage-500'
              : 'border-sage-100 hover:border-sage-300 hover:bg-white'
          }`}
        >
          <input
            type="checkbox"
            className="w-5 h-5 text-sage-600 rounded focus:ring-sage-500 border-gray-300"
            checked={selectedClassIds.has(cls.id)}
            onChange={() => toggleClassSelection(cls.id)}
            disabled={isSubmitting}
          />
          <div className="ml-3 flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className={`font-medium text-base ${selectedClassIds.has(cls.id) ? 'text-sage-900' : 'text-sage-700'}`}>
                {new Date(cls.date).toLocaleDateString()} ({['週日', '週一', '週二', '週三', '週四', '週五', '週六'][new Date(cls.date).getDay()]})
              </span>
              <span className="text-xs text-sage-500 bg-white px-2 py-0.5 rounded border border-sage-100 self-start sm:self-auto">
                {cls.timeDisplay}
              </span>
            </div>
          </div>
        </label>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-sage-100 min-h-[400px]">
        <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-serif text-sage-800 mb-2">報名成功！</h3>
        <p className="text-sage-600 text-center">感謝您的預約，期待在課堂上與您相見。</p>
        
        {uploadWarning && (
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-sm rounded border border-yellow-100 max-w-xs text-center">
                注意：{uploadWarning}<br/>
                請截圖此畫面傳給老師確認。
            </div>
        )}

        <button 
            onClick={() => setSubmitted(false)}
            className="mt-6 text-sm text-sage-500 hover:text-sage-700 underline"
        >
            繼續報名
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-sage-100 overflow-hidden">
      {/* Header Info Section */}
      <div className="bg-sage-600 p-6 text-white">
        <h2 className="text-2xl font-serif font-bold">{APP_CONFIG.instructor} 老師課程報名</h2>
        <div className="mt-4 space-y-3 text-sm text-sage-50">
          
          {/* Location */}
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <div>
              <strong className="block text-white">上課教室</strong>
              {APP_CONFIG.location}
              <div className="opacity-80 text-xs mt-0.5">({APP_CONFIG.locationNote})</div>
            </div>
          </div>

          {/* Rules */}
          <div className="flex items-start">
             <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             <div>
               <strong className="block text-white">開課規則</strong>
               {APP_CONFIG.rules}
             </div>
          </div>

          {/* Make-up Policy */}
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <div>
              <strong className="block text-white">補課機制</strong>
              <div className="whitespace-pre-line leading-relaxed opacity-95">
                {APP_CONFIG.makeupPolicy}
              </div>
            </div>
          </div>

          <div className="my-2 border-t border-sage-500 opacity-50"></div>

          {/* Contact Info */}
          <div className="flex items-start text-green-50 pt-1">
             <svg className="w-5 h-5 mr-2 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 0C5.4 0 .04 5.36.04 12S5.4 24 12.04 24c6.59 0 12-5.36 12-12S18.63 0 12.04 0zm0 22c-5.52 0-10-4.48-10-10S6.52 2 12.04 2s10 4.48 10 10-4.48 10-10 10zm-1-15h2v6h-2zm0 8h2v2h-2z" opacity="0"/><path d="M21.9 5.9c-.3-1.4-1.2-2.5-2.5-3.1C18.2 2.1 16.3 2 12 2S5.8 2.1 4.6 2.8c-1.3.6-2.2 1.7-2.5 3.1C2 7.1 2 9.5 2 12s0 4.9.1 6.1c.3 1.4 1.2 2.5 2.5 3.1 1.2.7 3.1.8 7.4.8s6.2-.1 7.4-.8c1.3-.6 2.2-1.7 2.5-3.1.1-1.2.1-3.6.1-6.1s0-4.9-.1-6.1zM12 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm4.4-10.4L10 16.2l-3.4-3.4 1.4-1.4 2 2 4.4-4.4 2 1.4z" fillRule="evenodd" clipRule="evenodd"/></svg>
             <div className="flex-1">
                 <strong className="block text-white mb-1">課程諮詢或報名聯繫方式</strong>
                 <div className="flex items-center gap-2 mb-1">
                     <span className="font-mono text-lg font-bold text-white tracking-wide">{APP_CONFIG.lineId}</span>
                     <CopyButton text={APP_CONFIG.lineId} className="bg-sage-700 text-green-100 hover:bg-sage-800" />
                 </div>
                 <div className="text-xs opacity-90">任何課程相關問題 歡迎加line與我聊聊 ：）</div>
             </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1">1. 學員姓名</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition"
            placeholder="請輸入您的真實姓名"
            disabled={isSubmitting}
          />
        </div>

        {/* Line ID */}
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1">2. Line ID</label>
          <input
            type="text"
            required
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition"
            placeholder="方便聯絡課程異動"
            disabled={isSubmitting}
          />
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-2">3. 選擇課程時間 (可複選)</label>
          
          <div className="space-y-6">
            
            {/* Yin Yoga Section */}
            <div className="bg-white border border-sage-200 rounded-xl shadow-sm overflow-hidden">
               {/* Header */}
               <div className="bg-sage-50 px-5 py-4 border-b border-sage-100">
                  <h3 className="flex items-center text-lg font-bold text-sage-800">
                     <span className="flex items-center justify-center w-8 h-8 bg-sage-200 text-sage-700 rounded-full mr-3 text-sm">
                        陰
                     </span>
                     修復陰瑜伽
                  </h3>
                  <p className="text-xs text-sage-500 mt-1 ml-11">週五上午 • 教室二</p>
               </div>
               {/* Content */}
               <div className="p-4">
                  {renderClassList(yinClasses)}
               </div>
            </div>

            {/* Hatha Yoga Section */}
            <div className="bg-white border border-sage-200 rounded-xl shadow-sm overflow-hidden">
               {/* Header */}
               <div className="bg-teal-50 px-5 py-4 border-b border-teal-100">
                  <h3 className="flex items-center text-lg font-bold text-teal-800">
                     <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-700 rounded-full mr-3 text-sm">
                        哈
                     </span>
                     哈達瑜珈
                  </h3>
                  <p className="text-xs text-teal-600 mt-1 ml-11">週一/週三晚間 • 週四上午</p>
               </div>
               {/* Content */}
               <div className="p-4">
                  {renderClassList(hathaClasses)}
               </div>
            </div>

          </div>
          
          {/* Total Calculation */}
          {selectedClassIds.size > 0 && (
              <div className="mt-3 text-right text-sage-800 font-medium bg-sage-50 p-3 rounded-lg border border-sage-100">
                  已選擇 <span className="text-xl font-bold text-sage-600">{selectedClassIds.size}</span> 堂課，
                  總計金額：<span className="text-xl font-bold text-sage-600">${calculateTotal()}</span>
              </div>
          )}
        </div>

        {/* Payment Section - FONT SIZE ADJUSTED TO BE MODERATE */}
        <div className="bg-sage-50 p-4 rounded-lg space-y-4 border border-sage-200">
            <div className="space-y-3 mb-4">
                <h4 className="font-bold text-sage-800 text-base">鐘點費支付方式 (每堂 $400)</h4>
                <div className="text-sm text-sage-700 space-y-3 bg-white p-4 rounded border border-sage-100">
                    {APP_CONFIG.paymentInfo.map((p, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                            <span className="font-bold text-sage-800 flex-shrink-0">{idx + 1}. {p.type}</span>
                            {p.account && (
                              <div className="flex items-center gap-2 pl-4 sm:pl-0 flex-wrap">
                                <span className="font-mono text-sage-900 font-medium select-all text-base">{p.account}</span>
                                {p.name && <span className="text-sage-600">({p.name})</span>}
                                <CopyButton text={p.account} className="" />
                              </div>
                            )}
                            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="pl-4 sm:pl-0 text-blue-600 underline truncate font-medium">LinePay 連結</a>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-sage-200">
                <label className="text-sm font-medium text-sage-800">4. 學員是否已經付款？</label>
                <div className="flex items-center space-x-6">
                    <label className="inline-flex items-center cursor-pointer p-1">
                        <input
                            type="radio"
                            className="w-5 h-5 text-sage-600 focus:ring-sage-500 border-gray-300"
                            checked={!isPaid}
                            onChange={() => setIsPaid(false)}
                            disabled={isSubmitting}
                        />
                        <span className="ml-2 text-sm text-sage-700">未付款</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer p-1">
                        <input
                            type="radio"
                            className="w-5 h-5 text-sage-600 focus:ring-sage-500 border-gray-300"
                            checked={isPaid}
                            onChange={() => setIsPaid(true)}
                            disabled={isSubmitting}
                        />
                        <span className="ml-2 text-sm text-sage-700">已付款</span>
                    </label>
                </div>
            </div>

            {isPaid && (
                <div className="animate-fade-in-down mt-3">
                     <label className="block text-sm font-medium text-sage-800 mb-1">5. 付款後五碼</label>
                     <input
                        type="text"
                        required={isPaid}
                        maxLength={5}
                        pattern="\d{5}"
                        value={paymentLast5}
                        onChange={(e) => setPaymentLast5(e.target.value.replace(/\D/g,''))}
                        className="w-full px-4 py-3 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition bg-white text-base tracking-widest"
                        placeholder="請輸入匯款帳號後5碼"
                        disabled={isSubmitting}
                    />
                </div>
            )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-sage-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-sage-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 transition-colors shadow-md text-xl flex justify-center items-center ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
              <>
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 處理中...
              </>
          ) : '確認報名'}
        </button>
      </form>
    </div>
  );
};

export default RegistrationForm;