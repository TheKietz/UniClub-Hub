import type { ClubListItem } from '@/components/membership/services/club.types'
import { C, type ClubCardData } from '@/components/public/publicComponents'

export const CLUB_CARD_COLORS = [C.indigo, C.coral, C.violet, C.mint, C.ink, C.coral, C.indigo, C.violet]

export const DEFAULT_CLUB_CARDS: ClubCardData[] = [
  {
    id: -1,
    name: 'CLB Công nghệ UEF',
    short: 'CNU',
    category: 'Học thuật & Nghiên cứu',
    memberCount: 7,
    hue: 200,
    description: 'Câu lạc bộ công nghệ thông tin - nơi sinh viên đam mê lập trình, AI và phát triển phần mềm cùng nhau học hỏi.',
    isRecruiting: true,
    color: C.indigo,
  },
  {
    id: -2,
    name: 'CLB Bóng đá UEF',
    short: 'CBD',
    category: 'Thể thao & Sức khỏe',
    memberCount: 3,
    hue: 20,
    description: 'Rèn luyện thể lực, tinh thần đồng đội và tranh tài trong các giải đấu sinh viên.',
    color: C.coral,
  },
  {
    id: -3,
    name: 'CLB Âm nhạc UEF',
    short: 'CAN',
    category: 'Văn nghệ & Nghệ thuật',
    memberCount: 4,
    hue: 280,
    description: 'Nơi những tâm hồn yêu nghệ thuật gặp nhau, biểu diễn và sáng tạo âm nhạc.',
    color: C.violet,
  },
  {
    id: -4,
    name: 'CLB Tiếng Anh UEF',
    short: 'CTA',
    category: 'Kỹ năng & Phát triển bản thân',
    memberCount: 3,
    hue: 340,
    description: 'Phát triển kỹ năng giao tiếp, IELTS, MC và thuyết trình bằng tiếng Anh.',
    isRecruiting: true,
    color: C.mint,
  },
  {
    id: -5,
    name: 'CLB Tình nguyện UEF',
    short: 'CTN',
    category: 'Tình nguyện & Cộng đồng',
    memberCount: 3,
    hue: 30,
    description: 'Kết nối sinh viên với cộng đồng qua các chương trình từ thiện và bảo vệ môi trường.',
    color: C.ink,
  },
]

export function toClubCardData(c: ClubListItem, i: number): ClubCardData {
  return {
    id: c.id,
    name: c.name,
    short: c.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 3).join('').toUpperCase(),
    category: c.categoryName ?? '',
    memberCount: c.memberCount ?? 0,
    hue: (i * 47 + 200) % 360,
    description: c.description ?? '',
    isRecruiting: c.isRecruiting ?? false,
    color: CLUB_CARD_COLORS[i % CLUB_CARD_COLORS.length],
    logoUrl: c.logoUrl,
  }
}
