import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findNoteById, updateNote } from '../utils/db'
import './Publish.css'

export default function EditNote() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      findNoteById(id).then(note => {
        if (note && note.author_id === user.id) {
          setTitle(note.title)
          setContent(note.content)
          setIngredients(note.ingredients)
          setSteps(note.steps)
          setImages(note.images || [])
        } else {
          navigate('/')
        }
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

    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (!content.trim()) {
      setError('请填写美食描述')
      return
    }
    if (!ingredients.trim()) {
      setError('请填写食材')
      return
    }
    if (!steps.trim()) {
      setError('请填写做法')
      return
    }
    if (images.length === 0) {
      setError('请上传美食图片')
      return
    }

    const updatedNote = {
      id,
      title: title.trim(),
      content: content.trim(),
      ingredients: ingredients.trim(),
      steps: steps.trim(),
      images,
      author_id: user.id,
      author_name: user.nickname,
      likes: 0,
      liked: false,
      created_at: new Date().toISOString()
    }

    await updateNote(updatedNote)
    navigate(`/note/${id}`)
  }

  return (
    <div className="publish-page">
      <div className="publish-card">
        <h2>编辑笔记</h2>
        <p className="publish-subtitle">修改你的美食分享</p>

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
            />
          </div>

          <div className="publish-field">
            <label>美食描述</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="这道菜有什么特别的故事？"
              rows={3}
            />
          </div>

          <div className="publish-field">
            <label>食材</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="需要哪些食材？"
              rows={3}
            />
          </div>

          <div className="publish-field">
            <label>做法</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="怎么做这道菜？"
              rows={4}
            />
          </div>

          <button type="submit" className="publish-button">
            保存修改
          </button>
        </form>
      </div>
    </div>
  )
}