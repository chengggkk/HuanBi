import { useState } from 'react';
import style from '../css/dailynews.module.css';
import DailyNews from './dailyNews';

export default function MainNews() {
    const [selectedTab, setSelectedTab] = useState('overview'); // 預設顯示 News Overview
    const [animationClass, setAnimationClass] = useState(''); // 控制動畫類別
    const [summary, setSummary] = useState(""); // 新增 summary 狀態

    const handleTabChange = (tab) => {
        if (tab !== selectedTab) {
            setAnimationClass(tab === 'summary' ? style.slideRight : style.slideLeft);
            setTimeout(() => {
                setSelectedTab(tab);
                setAnimationClass('');
            }, 300); // 動畫時間 300ms
        }
    };

    return (
        <main>
            {/* 上方導航欄 */}
            <div className={style.newsNav}>
                <div 
                    className={`${style.newsNavContent} ${selectedTab === 'overview' ? style.choose : style.nochoose}`}
                    onClick={() => handleTabChange('overview')}
                >
                    News Overview
                </div>
                {/* <div 
                    className={`${style.newsNavContent} ${selectedTab === 'summary' ? style.choose : style.nochoose}`}
                    onClick={() => handleTabChange('summary')}
                >
                    AI News Summary
                </div> */}
            </div>

            {/* 內容區域，添加滑動動畫 */}
            <div className={`${style.main} ${animationClass}`}>
                {selectedTab === 'overview' ? 
                    <DailyNews setSummary={setSummary} /> : 
                    <NewsSummary summary={summary} />
                }
            </div>
        </main>
    );
}
