import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createNote } from '../utils/db'
import heic2any from 'heic2any'
import TagInput from '../components/TagInput'
import './Publish.css'

const templates = [
  {
    id: 'trending',
    name: '网红美食',
    icon: '🔥',
    description: '适合分享网红美食发现和打卡',
    template: {
      title: '发现超火的网红美食｜XXX',
      content: '最近被疯狂种草的XXX，终于打卡了！\n\n📍 店铺：XXX\n📍 地址：XXX\n\n🔥 推荐理由：\n• 颜值超高，拍照超好看\n• 味道惊艳，名不虚传\n• 排队超火，建议早点去\n\n💰 价格：XX元\n⏰ 营业时间：9:00-17:00',
      ingredients: '✨ 必点菜品：\n• XXX（招牌必点）\n• XXX（网红款）\n• XXX（隐藏菜单）',
      steps: '📸 打卡攻略：\n1️⃣ 最佳拍照位置：门口/窗边/吧台\n2️⃣ 最佳打卡时间：避开饭点，人少好拍照\n3️⃣ 点餐技巧：提前查看大众点评推荐\n\n💡 小贴士：\n• 建议提前预约，避免排队\n• 高峰期可能需要等位\n• 可以错峰前往，体验更好\n\n🌟 评分：⭐⭐⭐⭐⭐\n值得打卡的网红美食！'
    }
  },
  {
    id: 'home-cooking',
    name: '家常菜',
    icon: '🍳',
    description: '适合分享家常菜做法',
    template: {
      title: '超下饭的XXX',
      content: '今天分享一道家常必备的XXX，简单易做又好吃！\n\n✨ 特点：\n• 操作简单，新手也能成功\n• 食材常见，超市就能买到\n• 味道超赞，家人都爱吃',
      ingredients: '主料：\n• XXX 适量\n\n配料：\n• XXX 适量\n\n调料：\n• 生抽 1勺\n• 老抽 半勺\n• 盐 适量',
      steps: '1️⃣ 准备工作\n将XXX洗净切好备用\n\n2️⃣ 开始烹饪\n锅中倒油，油热后放入XXX\n\n3️⃣ 调味\n加入调料，翻炒均匀\n\n4️⃣ 出锅\n装盘即可享用\n\n💡 小贴士：\n• 注意火候控制\n• 可以根据个人口味调整'
    }
  },
  {
    id: 'dessert',
    name: '甜品烘焙',
    icon: '🍰',
    description: '适合分享甜品、蛋糕等',
    template: {
      title: '自制XXX｜超简单零失败',
      content: '今天做了超好吃的XXX！\n\n🌟 亮点：\n• 不需要烤箱也能做\n• 零失败，新手友好\n• 颜值超高，朋友圈必备\n\n准备材料很简单，跟着做准没错！',
      ingredients: '主料：\n• XXX 100g\n\n辅料：\n• XXX 50g\n• 鸡蛋 2个\n\n装饰：\n• 奶油 适量\n• 水果 适量',
      steps: '1️⃣ 准备材料\n所有材料称重备用\n\n2️⃣ 混合搅拌\n将XXX混合均匀\n\n3️⃣ 成型\n倒入模具，震出气泡\n\n4️⃣ 烘烤/冷藏\n按温度时间烘烤或冷藏定型\n\n5️⃣ 装饰\n挤上奶油，摆上水果\n\n💡 小贴士：\n• 室温软化很重要\n• 不要过度搅拌'
    }
  },
  {
    id: 'quick-meal',
    name: '快手菜',
    icon: '⚡',
    description: '适合分享简单快手菜',
    template: {
      title: '10分钟搞定XXX',
      content: '忙碌的一天，来个快手菜吧！\n\n⏰ 用时：10分钟\n👨‍🍳 难度：⭐\n🍽️ 份量：1-2人\n\n简单三步就能搞定，特别适合上班族！',
      ingredients: '• XXX 适量\n• XXX 适量\n• 调料：生抽、盐、胡椒粉',
      steps: '1️⃣ 备菜（2分钟）\n所有材料洗净切好\n\n2️⃣ 烹饪（6分钟）\n热锅下油，快速翻炒\n\n3️⃣ 调味出锅（2分钟）\n加调料，翻炒均匀即可\n\n💡 小贴士：\n• 提前备好所有材料\n• 大火快炒更香'
    }
  },
  {
    id: 'cafe',
    name: '咖啡店打卡',
    icon: '☕',
    description: '适合分享咖啡店探店体验',
    template: {
      title: '发现一家宝藏咖啡店｜XXX',
      content: '📍 店名：XXX\n📍 地址：XXX\n\n☕ 今天来打卡这家超火的咖啡店！\n\n✨ 推荐理由：\n• 环境超赞，很适合拍照\n• 咖啡品质在线\n• 甜品也很好吃\n\n💰 人均：XX元\n⏰ 营业时间：9:00-17:00',
      ingredients: '☕ 招牌咖啡：\n• XXX（招牌必点）\n\n🍰 推荐甜品：\n• XXX\n\n🍽️ 其他推荐：\n• XXX',
      steps: '📸 拍照攻略：\n1️⃣ 靠窗位置光线最好\n2️⃣ 拿铁拉花很出片\n3️⃣ 甜品摆盘精致\n\n💡 探店小贴士：\n• 建议下午去，人少好拍照\n• 周末需要排队，建议提前\n• 可以预约靠窗位置\n\n🌟 评分：⭐⭐⭐⭐⭐\n会再来的一家店！'
    }
  }
]

export default function Publish() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleTemplateSelect = (template) => {
    if (selectedTemplate === template.id) {
      setSelectedTemplate(null)
      setTitle('')
      setContent('')
    } else {
      setSelectedTemplate(template.id)
      setTitle(template.template.title)
      setContent(`${template.template.content}\n\n### 食材\n${template.template.ingredients}\n\n### 做法\n${template.template.steps}`)
    }
  }

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files)
    if (images.length + files.length > 9) {
      setError('最多只能上传9张图片')
      return
    }

    const newImages = []
    let loadedCount = 0

    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif']
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
      
      if (!validTypes.includes(file.type) && !isHeic) {
        setError('支持JPEG、PNG、GIF、HEIC格式和iPhone Live Photo')
        continue
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setError('图片大小不能超过10MB')
        continue
      }

      try {
        let processedFile = file
        
        if (isHeic || file.type === 'image/heic' || file.type === 'image/heif') {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9
          })
          processedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg'
          })
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          compressImage(reader.result, 0.8).then(async (compressedImage) => {
            try {
              // 上传到服务器
              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  image: compressedImage,
                  filename: processedFile.name
                })
              })
              
              const data = await response.json()
              if (data.success) {
                newImages.push(data.url)
              } else {
                throw new Error(data.message || '上传失败')
              }
            } catch (uploadError) {
              console.error('上传失败:', uploadError)
              setError('图片上传失败，请重试')
            } finally {
              loadedCount++
              if (loadedCount === files.length && newImages.length > 0) {
                setImages(prevImages => [...prevImages, ...newImages])
              }
            }
          })
        }
        reader.readAsDataURL(processedFile)
      } catch (error) {
        console.error('Error processing image:', error)
        setError('图片处理失败，请重试')
        loadedCount++
        if (loadedCount === files.length && newImages.length > 0) {
          setImages(prevImages => [...prevImages, ...newImages])
        }
      }
    }
  }

  const compressImage = (dataUrl, quality) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        const maxWidth = 1024
        const maxHeight = 1024
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = dataUrl
    })
  }

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (loading) return // 防止重复提交

    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!content.trim()) {
      setError('请填写内容')
      return
    }
    if (images.length === 0) {
      setError('请上传美食图片')
      return
    }

    // 解析内容，提取食材和做法
    let parsedContent = content.trim()
    let parsedIngredients = ''
    let parsedSteps = ''
    
    // 提取食材部分
    const ingredientsMatch = parsedContent.match(/### 食材\n([\s\S]*?)(?=### 做法|$)/)
    if (ingredientsMatch) {
      parsedIngredients = ingredientsMatch[1].trim()
    }
    
    // 提取做法部分
    const stepsMatch = parsedContent.match(/### 做法\n([\s\S]*)$/)
    if (stepsMatch) {
      parsedSteps = stepsMatch[1].trim()
    }
    
    // 提取简介部分
    const contentMatch = parsedContent.match(/^(.*?)(?=### 食材|$)/s)
    if (contentMatch) {
      parsedContent = contentMatch[1].trim()
    }
    
    const newNote = {
      id: Date.now().toString(),
      title: title.trim(),
      content: parsedContent,
      ingredients: parsedIngredients,
      steps: parsedSteps,
      images,
      author_id: user.id,
      author_name: user.nickname,
      likes: 0,
      liked: false,
      created_at: new Date().toISOString()
    }

    setLoading(true)
    try {
      await createNote(newNote)
      
      // 如果有选择标签，为笔记添加标签
      if (selectedTags.length > 0) {
        const tagIds = selectedTags.map(tag => tag.id)
        await fetch(`/api/notes/${newNote.id}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ tagIds })
        })
      }
      
      navigate('/')
    } catch (error) {
      console.error('发布笔记失败:', error)
      setError('发布失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="publish-page">
      <div className="publish-card">
        <h2>发布笔记</h2>
        <p className="publish-subtitle">分享你的美食给大家</p>

        <div className="publish-templates">
          <h3 className="templates-title">📝 选择模板（可选）</h3>
          <div className="templates-grid">
            {templates.map(template => (
              <div
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="template-icon">{template.icon}</div>
                <div className="template-info">
                  <div className="template-name">{template.name}</div>
                  <div className="template-desc">{template.description}</div>
                </div>
                {selectedTemplate === template.id && (
                  <div className="template-check">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="publish-form">
          {error && <div className="publish-error">{error}</div>}

          <div className="publish-field">
            <label>美食图片（最多9张）</label>
            <div className="publish-images-grid">
              {images.map((img, index) => (
                <div key={index} className="publish-image-preview">
                  <img src={img} alt={`upload-${index}`} />
                  <button
                    type="button"
                    className="publish-image-remove"
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 9 && (
                <label className="publish-image-add">
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <span>+</span>
                  <p>{images.length}/9</p>
                </label>
              )}
            </div>
          </div>

          <div className="publish-field">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给美食取个名字吧"
              maxLength={50}
            />
          </div>

          <div className="publish-field">
            <label>内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的美食故事、食材和做法...\n\n示例：\n这道菜是我家的招牌菜，做法简单又好吃！\n\n### 食材\n• 主料：鸡蛋、西红柿\n• 调料：盐、糖、生抽\n\n### 做法\n1. 准备食材\n2. 开始烹饪\n3. 调味出锅"
              rows={15}
            />
          </div>

          <div className="publish-field">
            <label>标签</label>
            <TagInput 
              selectedTags={selectedTags} 
              onChange={setSelectedTags} 
              placeholder="输入标签，按回车添加"
            />
          </div>

          <button type="submit" className="publish-button" disabled={loading}>
            {loading ? '发布中...' : '发布笔记'}
          </button>
        </form>
      </div>
    </div>
  )
}
