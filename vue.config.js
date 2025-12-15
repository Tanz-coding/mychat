module.exports={
  publicPath:process.env.BASE_URL,
  assetsDir:"static",
  outputDir:"dist",
  productionSourceMap:false,
  css:{
    sourceMap:true
  },
  devServer:{
    proxy: {
     // 1. 先配置具体的规则（优先级高）
      '/socket.io': {
        target: process.env.PROXY_SERVER,
        ws: true, // 仅对 socket.io 开启 WebSocket 代理
        changeOrigin: true, // 必须开启：模拟后端域名的请求源，解决跨域
        secure: false // 如果后端是 http 协议，需关闭（https 则开启）
      },
      '/upload': {
        target: process.env.PROXY_SERVER,
        changeOrigin: true
      },
      '/assets': {
        target: process.env.PROXY_SERVER,
        changeOrigin: true
      },
      // 2. 最后配置宽泛的规则（匹配其他所有请求）
      '/': {
        target: process.env.PROXY_SERVER,
        changeOrigin: true,
        // pathRewrite: {} // 如果后端接口不需要前缀，可留空；若需要重写则配置，比如 pathRewrite: {'^/api': ''}
      }
    }
  }
};
