import React, { useState, useEffect } from 'react';
import { Registration } from '../types';
import { CSV_HEADERS, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../constants';
import { generateClassSummary } from '../services/geminiService';
import { storageService } from '../services/storage';

interface ClassGroup {
  className: string;
  classDate: string;
  students: Registration[];
}

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<{classId: string, text: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState(storageService.getApiUrl() || '');
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{connected: boolean; source: 'cloud' | 'local'; error?: string} | null>(null);
  
  // Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    const result = await storageService.getRegistrations();
    setRegistrations(result.data);
    setConnectionStatus({
      connected: result.source === 'cloud',
      source: result.source,
      error: result.error
    });
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveSettings = () => {
    if (apiUrl && !apiUrl.endsWith('/exec')) {
      alert("網址格式錯誤！\nGoogle Apps Script 網址結尾必須是 '/exec'。\n請檢查您複製的網址。");
      return;
    }
    storageService.setApiUrl(apiUrl);
    alert("設定已儲存！將嘗試重新連線...");
    setShowSettings(false);
    refreshData();
  };

  const handleTestConnection = async () => {
    if (!apiUrl) return;
    const result = await storageService.testConnection();
    alert(result.message);
  };

  const copyStudentLink = () => {
    if (!apiUrl) {
      alert("請先設定並儲存 Google Script URL");
      return;
    }
    const encoded = btoa(apiUrl);
    const link = `${window.location.origin}${window.location.pathname}?cfg=${encoded}`;
    navigator.clipboard.writeText(link);
    alert("學員報名專用連結已複製！\n請將此連結傳給學員，他們的資料就會自動匯入您的試算表。");
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    const result = await storageService.clearAllData();
    if (result.success) {
        alert("所有資料已成功刪除。");
        setRegistrations([]);
        refreshData();
    } else {
        alert(`刪除失敗：\n${result.error}`);
        // If it failed due to old script, we should refresh to show the user the weird data state (if any)
        refreshData(); 
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  // Group registrations
  const groupedData = registrations.reduce((acc, curr) => {
    const dateKey = curr.classDate.split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }
    if (!acc[dateKey][curr.classId]) {
      acc[dateKey][curr.classId] = {
        className: curr.className,
        classDate: curr.classDate,
        students: []
      };
    }
    acc[dateKey][curr.classId].students.push(curr);
    return acc;
  }, {} as Record<string, Record<string, ClassGroup>>);

  const sortedDates = Object.keys(groupedData).sort();

  const handleExportCSV = () => {
    let csvContent = "\uFEFF";
    const headers = CSV_HEADERS.map(h => h.label).join(",");
    csvContent += headers + "\n";

    registrations.forEach(r => {
      const row = [
        new Date(r.classDate).toLocaleDateString(),
        `"${r.className}"`,
        r.studentName,
        r.lineId,
        r.isPaid ? "已付款" : "未付款",
        r.paymentLast5 ? `'${r.paymentLast5}` : ""
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `yoga_registrations_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSummary = async (classId: string, className: string, classDate: string, students: Registration[]) => {
    setLoadingAi(classId);
    setAiMessage(null);
    const summary = await generateClassSummary(students, className, classDate);
    setAiMessage({ classId, text: summary });
    setLoadingAi(null);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      {!isLoading && apiUrl && connectionStatus?.source === 'local' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm leading-5 font-medium text-red-800">
                無法連線到 Google 試算表 (目前顯示本機暫存資料)
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>請檢查以下幾點：</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>網址是否正確？ (必須以 <code>/exec</code> 結尾)</li>
                  <li><strong>權限設定錯誤：</strong>請確認部署時，「誰可以存取」已設定為「<strong>任何人 (Anyone)</strong>」。這是最常見的錯誤。</li>
                </ul>
                <div className="mt-4">
                    <button 
                        onClick={() => setShowSettings(true)}
                        className="text-red-800 font-bold hover:underline"
                    >
                        前往設定檢查
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-sage-100 gap-4">
        <div>
           <h2 className="text-xl font-serif text-sage-800 flex items-center gap-2">
             報名管理
             {connectionStatus?.source === 'cloud' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    雲端同步中
                </span>
             )}
           </h2>
           <p className="text-sm text-sage-500">
             {isLoading ? '資料載入中...' : `目前共 ${registrations.length} 筆資料`}
           </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <button
             onClick={() => setShowSettings(!showSettings)}
             className="flex items-center space-x-2 bg-sage-50 text-sage-600 px-3 py-2 rounded-lg hover:bg-sage-100 transition text-sm font-medium border border-sage-200"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             <span className="hidden sm:inline">設定</span>
           </button>
           <button
             onClick={refreshData}
             className="flex items-center space-x-2 bg-sage-50 text-sage-600 px-3 py-2 rounded-lg hover:bg-sage-100 transition text-sm font-medium border border-sage-200"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             <span className="hidden sm:inline">重整</span>
           </button>
           <button
             onClick={handleExportCSV}
             className="flex items-center space-x-2 bg-sage-600 text-white px-3 py-2 rounded-lg hover:bg-sage-700 transition text-sm font-medium"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             <span>匯出</span>
           </button>
           <button
             onClick={onLogout}
             className="flex items-center space-x-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             <span>登出</span>
           </button>
        </div>
      </div>

      {/* Delete Button (Separate Row) */}
      <div className="flex justify-end">
          <button
             onClick={() => setShowDeleteConfirm(true)}
             className="flex items-center space-x-2 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition text-sm font-medium border border-transparent hover:border-red-200"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             <span>刪除全部歷史紀錄</span>
           </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">確定要刪除所有資料嗎？</h3>
              <p className="text-sm text-gray-500 mb-6">
                此動作將會清除<strong className="text-gray-800">所有學員的報名紀錄</strong>。<br/>
                此操作無法復原。
              </p>
              
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-4 bg-red-600 rounded-lg text-white hover:bg-red-700 font-medium shadow-md transition flex justify-center items-center"
                >
                  {isDeleting ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-sage-200 p-6 animate-fade-in-down">
           <h3 className="text-lg font-bold text-sage-800 mb-4">系統設定：Google 試算表連結</h3>
           
           <div className="space-y-4">
             <div className="bg-yellow-50 p-4 rounded border border-yellow-100 text-sm text-yellow-800">
               <strong className="block mb-2 text-yellow-900">重要：如何正確設定？</strong>
               <ol className="list-decimal pl-5 space-y-1">
                 <li>建立 Google 試算表，點選「擴充功能」 &gt; 「Apps Script」。</li>
                 <li>將下方代碼複製並覆蓋。</li>
                 <li>點選「部署」 &gt; 「新增部署作業」 &gt; 選擇「網頁應用程式」。</li>
                 <li><span className="text-red-600 font-bold">關鍵步驟：</span>將「誰可以存取」設定為「<strong>任何人 (Anyone)</strong>」。</li>
                 <li>複製產生的網址 (應以 <code>/exec</code> 結尾)，貼入下方。</li>
               </ol>
             </div>
             
             <div className="text-xs text-gray-500 mb-2">
                 * 若您需要使用「刪除全部資料」功能，請務必更新您的 Apps Script 為最新版本 (下方代碼)。
             </div>

             <textarea 
               readOnly 
               className="w-full h-32 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded text-gray-600 focus:outline-none"
               value={GOOGLE_APPS_SCRIPT_TEMPLATE}
               onClick={(e) => e.currentTarget.select()}
             />
             
             <div className="pt-4 border-t border-gray-100">
               <label className="block text-sm font-bold text-sage-800 mb-2">Google Apps Script 網頁應用程式網址 (Web App URL)</label>
               <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value.trim())}
                    className={`flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-sage-500 outline-none ${apiUrl && !apiUrl.endsWith('/exec') ? 'border-red-500 bg-red-50' : 'border-sage-300'}`}
                    placeholder="https://script.google.com/macros/s/..../exec"
                 />
                 <button
                    onClick={handleTestConnection}
                    disabled={!apiUrl}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 border border-gray-200 whitespace-nowrap"
                 >
                    測試連線
                 </button>
               </div>
               {apiUrl && !apiUrl.endsWith('/exec') && (
                 <p className="text-xs text-red-500 mt-1">網址似乎不正確，請確保結尾是 /exec (不是 /edit)</p>
               )}
             </div>

             <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={copyStudentLink}
                  className="text-sage-600 hover:text-sage-800 text-sm font-medium underline decoration-dotted"
                  disabled={!apiUrl || !connectionStatus?.connected}
                >
                  複製學員專用報名連結 (設定完畢後使用)
                </button>

                <div className="space-x-2">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-sage-600 text-white rounded hover:bg-sage-700 font-medium"
                  >
                    儲存設定
                  </button>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Data List */}
      {isLoading ? (
        <div className="text-center py-12">
           <svg className="animate-spin h-8 w-8 text-sage-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
           <p className="text-sage-500">正在讀取報名資料...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow border border-sage-100 h-64">
          <p className="text-sage-400 text-lg mb-2">目前尚無報名資料</p>
          <p className="text-sm text-sage-300">資料將會顯示於此</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in-up">
          {sortedDates.map(dateKey => (
            <div key={dateKey} className="space-y-4">
              <h3 className="text-lg font-bold text-sage-800 border-l-4 border-sage-500 pl-3 flex items-center">
                {new Date(dateKey).toLocaleDateString()}
                <span className="ml-2 text-xs font-normal text-sage-500 bg-sage-100 px-2 py-0.5 rounded-full">
                  {['週日', '週一', '週二', '週三', '週四', '週五', '週六'][new Date(dateKey).getDay()]}
                </span>
              </h3>
              
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
                {Object.values(groupedData[dateKey]).map((group: ClassGroup) => (
                  <div key={group.students[0].classId} className="bg-white rounded-xl shadow overflow-hidden border border-sage-100">
                    <div className="bg-sage-50 px-6 py-4 border-b border-sage-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div>
                        <h4 className="font-semibold text-sage-800">{group.className}</h4>
                        <span className="text-xs text-sage-500 bg-white px-2 py-1 rounded border border-sage-200 mt-1 inline-block">
                          {group.students.length} 人報名
                        </span>
                      </div>
                      <button
                          onClick={() => handleGenerateSummary(group.students[0].classId, group.className, group.classDate, group.students)}
                          disabled={loadingAi === group.students[0].classId}
                          className="text-xs flex items-center justify-center space-x-1 bg-gradient-to-r from-teal-500 to-sage-500 text-white px-3 py-2 rounded hover:opacity-90 transition disabled:opacity-50"
                      >
                          {loadingAi === group.students[0].classId ? (
                               <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                          ) : (
                              <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                  <span>AI 課程摘要</span>
                              </>
                          )}
                      </button>
                    </div>

                    {/* AI Output Area */}
                    {aiMessage && aiMessage.classId === group.students[0].classId && (
                        <div className="bg-blue-50 p-4 border-b border-blue-100 text-sm text-blue-800 whitespace-pre-wrap relative">
                            <button 
                              onClick={() => setAiMessage(null)}
                              className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
                            >
                               ✕
                            </button>
                            <div className="font-bold mb-1">Gemini 建議訊息：</div>
                            {aiMessage.text}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-sage-100">
                        <thead className="bg-sage-50/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">Line ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">後五碼</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-sage-100">
                          {group.students.map((student) => (
                            <tr key={student.id} className="hover:bg-sage-50/30 transition">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-sage-900">{student.studentName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-sage-600">{student.lineId}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {student.isPaid ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    已付款
                                  </span>
                                ) : (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    未付款
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-sage-500 font-mono">
                                {student.isPaid ? student.paymentLast5 : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
