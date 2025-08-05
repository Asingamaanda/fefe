// Frontend File Upload Integration for FEFE
// Add this to your frontend to handle file uploads

class FefeFileUpload {
  constructor(apiBaseURL = 'http://localhost:5000/api') {
    this.apiBaseURL = apiBaseURL;
    this.token = localStorage.getItem('fefeAuthToken');
  }

  // Upload product images
  async uploadProductImages(files) {
    const formData = new FormData();
    
    // Add multiple files
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Product image upload error:', error);
      throw error;
    }
  }

  // Upload course materials
  async uploadCourseMaterials(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('materials', files[i]);
    }

    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('Course materials upload error:', error);
      throw error;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw error;
    }
  }

  // Upload general files
  async uploadFiles(files, category = 'general') {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    formData.append('category', category);

    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/general`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  // Get uploaded files list
  async getFilesList(category = 'general', page = 1, limit = 20) {
    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/files?category=${category}&page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Get files list error:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(filename, category = 'general') {
    try {
      const response = await fetch(`${this.apiBaseURL}/uploads/files/${filename}?category=${category}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }
}

// Create upload components
function createUploadComponent() {
  const uploadManager = new FefeFileUpload();

  // Product Image Upload Component
  function createProductImageUploader() {
    const container = document.createElement('div');
    container.className = 'upload-component';
    container.innerHTML = `
      <div class="upload-area" style="
        border: 2px dashed #8B7355;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        background: #F5F0E8;
        margin: 1rem 0;
      ">
        <input type="file" id="productImages" multiple accept="image/*" style="display: none;">
        <label for="productImages" style="
          cursor: pointer;
          color: #8B7355;
          font-weight: 600;
        ">
          📸 Click to upload product images
          <br><small>JPG, PNG, GIF up to 10MB each</small>
        </label>
      </div>
      <div id="uploadProgress" style="display: none;">
        <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div id="progressBar" style="
            height: 8px;
            background: #8B7355;
            width: 0%;
            transition: width 0.3s ease;
          "></div>
        </div>
        <p id="progressText">Uploading...</p>
      </div>
      <div id="uploadResults"></div>
    `;

    const fileInput = container.querySelector('#productImages');
    const uploadProgress = container.querySelector('#uploadProgress');
    const progressBar = container.querySelector('#progressBar');
    const progressText = container.querySelector('#progressText');
    const uploadResults = container.querySelector('#uploadResults');

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      // Show progress
      uploadProgress.style.display = 'block';
      progressBar.style.width = '0%';
      progressText.textContent = 'Uploading...';

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          const currentWidth = parseInt(progressBar.style.width) || 0;
          if (currentWidth < 90) {
            progressBar.style.width = (currentWidth + 10) + '%';
          }
        }, 200);

        const result = await uploadManager.uploadProductImages(files);
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Upload complete!';

        // Show results
        uploadResults.innerHTML = `
          <div style="margin-top: 1rem; padding: 1rem; background: #d4edda; border-radius: 4px; color: #155724;">
            ✅ Successfully uploaded ${result.files.length} images
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              ${result.files.map(file => `
                <li>
                  <strong>${file.originalName}</strong> 
                  <br><small>URL: ${file.url}</small>
                </li>
              `).join('')}
            </ul>
          </div>
        `;

        setTimeout(() => {
          uploadProgress.style.display = 'none';
        }, 3000);

      } catch (error) {
        uploadProgress.style.display = 'none';
        uploadResults.innerHTML = `
          <div style="margin-top: 1rem; padding: 1rem; background: #f8d7da; border-radius: 4px; color: #721c24;">
            ❌ Upload failed: ${error.message}
          </div>
        `;
      }
    });

    return container;
  }

  // Profile Picture Upload Component
  function createProfileUploader() {
    const container = document.createElement('div');
    container.className = 'profile-upload';
    container.innerHTML = `
      <div style="text-align: center; margin: 1rem 0;">
        <div id="avatarPreview" style="
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #F5F0E8;
          border: 3px solid #8B7355;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          <span style="color: #8B7355; font-size: 2rem;">👤</span>
        </div>
        <input type="file" id="profilePic" accept="image/*" style="display: none;">
        <label for="profilePic" style="
          background: #8B7355;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          display: inline-block;
        ">
          📷 Change Profile Picture
        </label>
      </div>
    `;

    const fileInput = container.querySelector('#profilePic');
    const avatarPreview = container.querySelector('#avatarPreview');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Profile picture preview" style="width: 100%; height: 100%; object-fit: cover;">`;
      };
      reader.readAsDataURL(file);

      try {
        const result = await uploadManager.uploadProfilePicture(file);
        console.log('Profile picture uploaded:', result);
        
        // You could update the user's profile here
        // await updateUserProfile({ avatar: result.file.url });
        
      } catch (error) {
        console.error('Profile upload failed:', error);
        alert('Failed to upload profile picture: ' + error.message);
      }
    });

    return container;
  }

  return {
    createProductImageUploader,
    createProfileUploader,
    uploadManager
  };
}

// Usage example:
document.addEventListener('DOMContentLoaded', function() {
  const uploadComponents = createUploadComponent();
  
  // Add product image uploader to FEFE Wear admin page
  const productUploadArea = document.querySelector('#productUploadArea');
  if (productUploadArea) {
    productUploadArea.appendChild(uploadComponents.createProductImageUploader());
  }
  
  // Add profile uploader to user settings
  const profileUploadArea = document.querySelector('#profileUploadArea');
  if (profileUploadArea) {
    profileUploadArea.appendChild(uploadComponents.createProfileUploader());
  }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FefeFileUpload, createUploadComponent };
}
