import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

// ŹRÓDŁO: Realtime Database (projekt lapose)
const sourceConfig = {
  apiKey: 'AIzaSyBghDQYhpnLcXzzKsG8MtKHEre_wUaIYJM',
  authDomain: 'lapose-d2a83.firebaseapp.com',
  databaseURL: 'https://lapose-d2a83-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'lapose-d2a83',
  storageBucket: 'lapose-d2a83.firebasestorage.app',
  messagingSenderId: '633119883215',
  appId: '1:633119883215:web:9edb546bdd7ee505919cba',
  measurementId: 'G-XBH8CV4L5Y',
}

// CEL: Firestore (projekt analisappkaraoke)
const targetConfig = {
  apiKey: 'AIzaSyAd-aHbheTlUnjHnCWlbO8bxim3LPZk99A',
  authDomain: 'analisappkaraoke.firebaseapp.com',
  projectId: 'analisappkaraoke',
  storageBucket: 'analisappkaraoke.firebasestorage.app',
  messagingSenderId: '643541065070',
  appId: '1:643541065070:web:73d1b2eaf81592cc1af57f',
  measurementId: 'G-HSWWFDS83P',
}

const sourceApp = initializeApp(sourceConfig, 'source')
const targetApp = initializeApp(targetConfig, 'target')

export const rtdb = getDatabase(sourceApp)
export const fdb = getFirestore(targetApp)
