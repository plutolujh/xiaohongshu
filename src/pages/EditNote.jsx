import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findNoteById, updateNote } from '../utils/db'
import Loading from '../components/Loading'
import './Publish.css'

export default function EditNote() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingNote, setLoadingNote] = useState(true)
  const [success, setSuccess] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      findNoteById(id).then(note => {
        if (note && note.author_id === user.id) {
          setTitle(note.title)
          // 将三个字段合并成一个content字段
          setContent(`${note.content}\n\n### 食材\n${note.ingredients}\n\n### 做法\n${note.steps}`)
          setImages(note.images || [])
        } else {
          navigate('/')
        }
        setLoadingNote(false)
      }).catch(err => {
        setError('加载笔记失败，请重试')
        setLoadingNote(false)
      })
    }
  }, [id, user, navigate])

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (images.length + files.length > 9) {
      setError('最多只能上传9张图片')
      return
    }

    const newImages = []
    let loadedCount = 0

    files.forEach(file => {
      // 验证图片格式
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validTypes.includes(file.type)) {
        setError('只支持JPEG、PNG和GIF格式的图片')
        return
      }

      // 验证图片大小（5MB限制）
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError('图片大小不能超过5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        // 压缩图片
        compressImage(reader.result, 0.8).then(compressedImage => {
          newImages.push(compressedImage)
          loadedCount++
          if (loadedCount === files.length) {
            setImages([...images, ...newImages])
          }
        })
      }
      reader.readAsDataURL(file)
    })
  }

  // 压缩图片函数
  const compressImage = (dataUrl, quality) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // 设置压缩后的尺寸（保持比例）
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

        // 转换为base64
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
    setSuccess(false)

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
    
    const updatedNote = {
      id,
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
      const result = await updateNote(updatedNote)
      if (result.success) {
        setSuccess(true)
        // 延迟1秒后跳转，让用户看到成功提示
        setTimeout(() => {
          navigate(`/note/${id}`)
        }, 1000)
      } else {
        setError('保存失败：' + (result.message || '未知错误'))
      }
    } catch (err) {
      setError('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (loadingNote) {
    return (
      <div className="publish-page">
        <div className="page-loading">
          <Loading text="正在加载笔记..." size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="publish-page">
      <div className="publish-card">
        <h2>编辑笔记</h2>
        <p className="publish-subtitle">修改你的美食分享</p>

        <form onSubmit={handleSubmit} className="publish-form">
          {error && <div className="publish-error">{error}</div>}
          {success && <div className="publish-success">保存成功！</div>}

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
                    accept="image/*"
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
              disabled={loading}
            />
          </div>

          <div className="publish-field">
            <label>内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的美食故事、食材和做法...\n\n示例：\n这道菜是我家的招牌菜，做法简单又好吃！\n\n### 食材\n• 主料：鸡蛋、西红柿\n• 调料：盐、糖、生抽\n\n### 做法\n1. 准备食材\n2. 开始烹饪\n3. 调味出锅"
              rows={15}
              disabled={loading}
            />
          </div>

          <button type="submit" className="publish-button" disabled={loading}>
            {loading ? (
              <div className="button-loading">
                <Loading text="" size="small" />
                <span>保存中...</span>
              </div>
            ) : '保存修改'}
          </button>
        </form>
      </div>
    </div>
  )
}