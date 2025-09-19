import { Button } from '@/components/ui/button'
import { useWorkers } from '../context/workers-context'
import { Upload, UserPlus } from 'lucide-react'


export function WorkersPrimaryButtons() {
  const { setOpen } = useWorkers()
  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('import')}
      >
        <span>Import</span> <Upload size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Add Worker</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
