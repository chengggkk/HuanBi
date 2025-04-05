import { useState } from 'react';
import style from '../css/dailynews.module.css';
import MobileCryptoInterface from './trend'
import Transactions from './transactions'

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
            }, 100); // 動畫時間 300ms
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
                    SWAP
                </div>
                <div 
                    className={`${style.newsNavContent} ${selectedTab === 'summary' ? style.choose : style.nochoose}`}
                    onClick={() => handleTabChange('summary')}
                >
                    Transactions
                </div>
            </div>

            {/* 內容區域，添加滑動動畫 */}
            <div className={`${style.main} ${animationClass}`}>
                {selectedTab === 'overview' ? 
                    <MobileCryptoInterface setSummary={setSummary} /> : 
                    <Transactions address={"0xfE9511B9e5ee142c6164529Af39759f509B8dd82"} />
                }
            </div>
        </main>
    );
}
