import '../styles/globals.css'
import Layout from '../context/lensContext'
function MyApp({ Component, pageProps }) {
  return ( 
      <Layout>
        <Component {...pageProps} />
      </Layout>
  )
}

export default MyApp
