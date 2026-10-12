# Implement Community Gallery

## Objective
Implement a community gallery system for LaGochaGaming that allows users to upload images and view them in a web gallery. The system must support image upload, storage in cloud storage, and moderation before display.

## Requirements

1. **Image Upload**: Users can upload images from their device using drag-and-drop and file input
2. **Storage**: Images must be stored in a cloud storage service with public URLs
3. **Moderation**: Images must be reviewed before being visible to all users
4. **Display**: Approved images shown in a gallery with like functionality
5. **Auto-refresh**: Gallery automatically updates when new images are approved

## Technical Stack

- Frontend: HTML5 with JavaScript and Supabase client library
- Backend: Supabase for storage and database
- Integration: Discord for moderation notifications
- Deployment: GitHub Pages for hosting

## Implementation Plan

### Phase 1: Supabase Setup
1. Create Supabase project with:
   - Storage bucket for images
   - Database table 'approved_images' with columns:
     * id (primary key)
     * filename (text)
     * url (text)
     * status (text)
     * created_at (timestamp)
2. Configure CORS for web access
3. Obtain Supabase URL and anon key

### Phase 2: Frontend Implementation
1. **HTML Structure**:
   - Upload section with drag & drop area
   - Gallery grid to display approved images
   - Lightbox for image preview
   - Like buttons for each image
2. **JavaScript Implementation**:
   - Initialize Supabase client with credentials
   - Load approved images on page load
   - Handle file upload to Supabase storage
   - Send upload notifications to Discord
   - Display images with like functionality
   - Auto-refresh approved images list

### Phase 3: Discord Integration
1. Create Discord bot with:
   - Webhook URL for posting images
   - Command handling for approval/rejection
   - Image moderation interface
2. Integrate with upload process
3. Auto-approve images after simulated moderation delay

### Phase 4: Testing and Validation
1. **Manual Testing**:
   - Test image upload with various formats (JPG, PNG, GIF)
   - Verify drag & drop functionality
   - Confirm lightbox preview works
   - Test like button increments
   - Check responsive design on 1024px and 768px breakpoints
2. **Integration Testing**:
   - Verify Supabase storage connection
   - Test database insertion
   - Confirm Discord notification flow
   - Validate gallery auto-refresh

### Phase 5: Deployment
1. Commit changes to GitHub repository
2. Configure GitHub Pages for site hosting
3. Update DNS if needed
4. Test live deployment

## Files to Modify

1. **galeria.html**: Complete rewrite with:
   - New Supabase integration
   - Upload component
   - Gallery display with like buttons
   - Lightbox functionality
2. **style.css**: Add gallery-specific styles
3. **Plan File**: 1791779138577-gallery-community-plan.md (existing plan)

## Dependencies

- Add Supabase JavaScript library
- Ensure CORS configuration
- Discord webhook URLs

## Risks and Mitigation

1. **Security**: Validate image uploads, prevent malicious content
   - Mitigation: File type validation, size limits
2. **Performance**: Large image uploads may be slow
   - Mitigation: Compress images, implement progress indicators
3. **Moderate Delays**: Discord moderation simulation
   - Mitigation: Use simulated approval for initial testing
4. **Storage Costs**: Supabase storage fees
   - Mitigation: Configure appropriate storage limits

## Acceptance Criteria

- Users can upload images (max 5MB each)
- Images are stored in Supabase with public URLs
- Uploaded images trigger Discord notification
- Approved images appear in gallery within 2 seconds
- Gallery auto-refreshes when new images are approved
- Like buttons increment and display count
- Lightbox preview works for all images
- Responsive design works on desktop and mobile
- No console errors in browser

## Estimated Timeline

- Supabase setup: 30 minutes
- Frontend implementation: 2 hours
- Discord integration: 1 hour
- Testing: 1 hour
- Deployment: 30 minutes

Total: 4 hours

## Current Status

This plan implements the community gallery system based on the existing plan requirements. The existing galeria.html needs significant refactoring to implement Supabase integration, upload functionality, and Discord moderation. The plan is ready for implementation.