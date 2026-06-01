using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UniClub_Hub.Membership.DTOs.Permission;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/club-permissions")]
    [Authorize]
    public class ClubPermissionsController : ControllerBase
    {
        private readonly IClubPermissionCatalogService _catalog;
        private readonly IClubPermissionService _permissions;

        public ClubPermissionsController(
            IClubPermissionCatalogService catalog,
            IClubPermissionService permissions
        )
        {
            _catalog = catalog;
            _permissions = permissions;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var permissions = _catalog.GetAll();
            return Ok(ApiResponse<IReadOnlyList<ClubPermissionDto>>.Ok(permissions));
        }

        [HttpGet("~/api/clubs/{clubId:int}/permissions/me")]
        public async Task<IActionResult> GetMine(int clubId)
        {
            try
            {
                var result = await _permissions.GetEffectivePermissionsAsync(
                    clubId,
                    GetUserId(),
                    User.IsInRole("SUPER_ADMIN")
                );

                return Ok(ApiResponse<ClubEffectivePermissionsDto>.Ok(result));
            }
            catch (UnauthorizedAccessException) { return Forbid(); }
            catch (KeyNotFoundException ex) { return NotFound(ApiResponse<object>.Fail(ex.Message)); }
        }

        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }
}
