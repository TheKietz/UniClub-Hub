using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.Pipeline;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Constants;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Models;

namespace UniClub_Hub.Membership.Services.Implements
{
    public class PipelineService : IPipelineService
    {
        private readonly UniClubDbContext _db;
        private readonly IClubPermissionService _permissions;

        public PipelineService(UniClubDbContext db, IClubPermissionService permissions)
        {
            _db = db;
            _permissions = permissions;
        }

        public async Task<IEnumerable<PipelineStageDto>> GetStagesAsync(int clubId)
        {
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            return await _db.ClubPipelineStages
                .AsNoTracking()
                .Where(s => s.ClubId == clubId && s.IsActive)
                .OrderBy(s => s.StageOrder)
                .Select(s => ToDto(s))
                .ToListAsync();
        }

        public async Task<PipelineStageDto> CreateStageAsync(
            int clubId,
            CreatePipelineStageRequest req,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            if (!await _db.Clubs.AnyAsync(c => c.Id == clubId))
                throw new KeyNotFoundException($"Không tìm thấy CLB với ID {clubId}.");

            var stage = new ClubPipelineStage
            {
                ClubId = clubId,
                Name = req.Name.Trim(),
                StageOrder = req.StageOrder,
                IsActive = true,
            };
            _db.ClubPipelineStages.Add(stage);
            await _db.SaveChangesAsync();
            return ToDto(stage);
        }

        public async Task<PipelineStageDto> UpdateStageAsync(
            int clubId,
            int stageId,
            UpdatePipelineStageRequest req,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            var stage = await _db.ClubPipelineStages
                .FirstOrDefaultAsync(s => s.Id == stageId && s.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy vòng tuyển.");

            if (req.Name != null) stage.Name = req.Name.Trim();
            if (req.StageOrder.HasValue) stage.StageOrder = req.StageOrder.Value;
            if (req.IsActive.HasValue) stage.IsActive = req.IsActive.Value;

            await _db.SaveChangesAsync();
            return ToDto(stage);
        }

        public async Task DeleteStageAsync(int clubId, int stageId, string requesterUserId, bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            var stage = await _db.ClubPipelineStages
                .FirstOrDefaultAsync(s => s.Id == stageId && s.ClubId == clubId)
                ?? throw new KeyNotFoundException("Không tìm thấy vòng tuyển.");

            _db.ClubPipelineStages.Remove(stage);
            await _db.SaveChangesAsync();
        }

        public async Task ReorderAsync(
            int clubId,
            ReorderStagesRequest req,
            string requesterUserId,
            bool isSuperAdmin)
        {
            await EnsureCanManageAsync(clubId, requesterUserId, isSuperAdmin);
            var stages = await _db.ClubPipelineStages
                .Where(s => s.ClubId == clubId && req.StageIds.Contains(s.Id))
                .ToListAsync();

            for (int i = 0; i < req.StageIds.Count; i++)
            {
                var stage = stages.FirstOrDefault(s => s.Id == req.StageIds[i]);
                if (stage != null) stage.StageOrder = i + 1;
            }
            await _db.SaveChangesAsync();
        }

        private static PipelineStageDto ToDto(ClubPipelineStage s) =>
            new() { Id = s.Id, Name = s.Name, StageOrder = s.StageOrder, IsActive = s.IsActive };

        private Task EnsureCanManageAsync(int clubId, string requesterUserId, bool isSuperAdmin) =>
            _permissions.EnsureHasPermissionAsync(
                clubId,
                requesterUserId,
                isSuperAdmin,
                ClubPermissions.RecruitmentPipelineManage);
    }
}
