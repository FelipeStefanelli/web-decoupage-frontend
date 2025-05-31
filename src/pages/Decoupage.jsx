import VideoUploader from '@/components/VideoUploader';
import TimecodesSection from '@/components/TimecodesSection';

export default function Decoupage() {
    return (
        <div style={{ display: 'flex', width: '100%' }}>
            <VideoUploader />
            <TimecodesSection />
        </div>
    );
}
