using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniClub_Hub.Membership.DTOs.LandingPage;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;
using UniClub_Hub.Shared.Data;
using UniClub_Hub.Shared.Enums;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/clubs/{clubId:int}/landing-page")]
    [Authorize]
    public class LandingPageController(ILandingPageService service, UniClubDbContext db) : ControllerBase
    {
        // GET /api/clubs/{clubId}/landing-page
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Get(int clubId)
        {
            var result = await service.GetAsync(clubId);
            return Ok(ApiResponse<LandingPageResponse>.Ok(result));
        }

        // PUT /api/clubs/{clubId}/landing-page
        [HttpPut]
        public async Task<IActionResult> Upsert(int clubId, [FromBody] UpsertLandingPageRequest dto)
        {
            if (!await IsClubAdmin(clubId)) return Forbid();

            var result = await service.UpsertAsync(clubId, dto);
            return Ok(ApiResponse<LandingPageResponse>.Ok(result, "Đã lưu landing page."));
        }

        // POST /api/clubs/{clubId}/landing-page/hero
        [HttpPost("hero")]
        public async Task<IActionResult> UploadHero(int clubId, IFormFile file)
        {
            if (!await IsClubAdmin(clubId)) return Forbid();

            try
            {
                var url = await service.UploadHeroAsync(clubId, file);
                return Ok(ApiResponse<object>.Ok(new { heroImage = url }, "Upload ảnh hero thành công."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // ── Helper ───────────────────────────────────────────────────────────

        private async Task<bool> IsClubAdmin(int clubId)
        {
            if (User.IsInRole("SUPER_ADMIN")) return true;

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return await db.ClubMemberships.AnyAsync(m =>
                m.UserId == userId
                && m.ClubId == clubId
                && m.ClubRole == ClubRole.CLUB_ADMIN
                && m.Status == MembershipStatus.Active);
        }
    }
}
