with open('src/components/CustomerTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_vars = '''
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuRect, setActionMenuRect] = useState<DOMRect | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);'''

target = "const [newPaymentMethodId, setNewPaymentMethodId] = useState('');"
content = content.replace(target, target + state_vars)

import_target = "} from 'lucide-react';"
content = content.replace(import_target, "  Pencil,\n} from 'lucide-react';")

with open('src/components/CustomerTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
