import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faNewspaper, faChartLine, faGamepad, faWallet } from '@fortawesome/free-solid-svg-icons';

import style from '../css/dailynews.module.css'


export default function NewsSummary({ summary }) {
    return (
        <main>
            <div className={style.Summary}>
                <div className={style.SummaryTitle}>
                    Summary
                </div>
                <div className={style.SummaryContent}>
                    {summary ? summary : "Loading summary..."}
                </div>
            </div>



        </main>
    );
}
