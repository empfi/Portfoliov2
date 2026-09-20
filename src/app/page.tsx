import DeskScene from '@/components/DeskScene';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* 
        Our 2.5D interactive desk scene takes up the full screen.
        UI overlays (like menus, project details) can be added as 
        absolute positioned HTML elements inside or alongside DeskScene.
      */}
      <DeskScene />
    </main>
  );
}
