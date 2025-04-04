import styles from "../css/navbar.module.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faNewspaper} from '@fortawesome/free-solid-svg-icons';


export default function Navbar() {  // ✅ 改成大寫
    return (
        <div className={styles.main}>
            <div className={styles.iconContainer}>
                <div ><FontAwesomeIcon icon={faNewspaper} className={styles.icon}/></div>
                <div><FontAwesomeIcon icon={faNewspaper} className={styles.icon}/></div>
                <div><FontAwesomeIcon icon={faNewspaper} className={styles.icon}/></div>
            </div>
        </div>
    );
}
